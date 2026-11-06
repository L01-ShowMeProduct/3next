require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CapturesService } = require('../dist/captures/captures.service');
const { TasksService } = require('../dist/tasks/tasks.service');
const service = () => new CapturesService(new TasksService());
const geminiResponse = (tasks) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ tasks }) }] } }] }) });
const hasStatus = (status) => (error) => error.getStatus?.() === status;

function env(t, changes) {
  const previous = Object.fromEntries(Object.keys(changes).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
}

test('rejects whitespace captures and returns local parser failures as 400', async () => {
  const captures = service();
  assert.throws(() => captures.create({ text: '   ', mode: 'text' }), hasStatus(400));
  const capture = captures.create({ text: ' ... ', mode: 'text' });
  await assert.rejects(captures.parse(capture.id, { engine: 'local' }), hasStatus(400));
  assert.equal(captures.findOne(capture.id).status, 'draft');
});

test('blocks concurrent parse and pending discard without losing the first drafts', async (t) => {
  const captures = service();
  const capture = captures.create({ text: 'Mai họp nhóm', mode: 'text' });
  let resolve;
  let calls = 0;
  t.mock.method(global, 'fetch', () => { calls++; return new Promise(r => { resolve = r; }); });
  const first = captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key', model: 'test-model' });
  await assert.rejects(captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key', model: 'test-model' }), hasStatus(409));
  assert.throws(() => captures.discard(capture.id), hasStatus(409));
  assert.equal(calls, 1);
  resolve(geminiResponse([{ title: 'Họp nhóm' }]));
  const parsed = await first;
  assert.equal(parsed.status, 'review');
  const confirmed = captures.confirm(capture.id, { selectedIds: [parsed.drafts[0].id] });
  assert.equal(confirmed.created, 1);
  assert.equal(confirmed.tasks[0].title, 'Họp nhóm');
});

test('rejects stale or foreign draft IDs and keeps the capture for a valid retry', async () => {
  const captures = service();
  const capture = captures.create({ text: 'Mai họp nhóm', mode: 'text' });
  const parsed = await captures.parse(capture.id, { engine: 'local' });
  assert.throws(() => captures.confirm(capture.id, { selectedIds: [parsed.drafts[0].id, 'foreign-draft'] }), hasStatus(400));
  assert.equal(captures.findOne(capture.id).status, 'review');
  const confirmed = captures.confirm(capture.id, { selectedIds: [parsed.drafts[0].id, parsed.drafts[0].id] });
  assert.equal(confirmed.created, 1);
  assert.throws(() => captures.findOne(capture.id), hasStatus(404));
});

test('an empty selectedIds explicitly cancels all drafts', async () => {
  const captures = service();
  const capture = captures.create({ text: 'Mua sách', mode: 'text' });
  await captures.parse(capture.id, { engine: 'local' });
  assert.equal(captures.confirm(capture.id, { selectedIds: [] }).created, 0);
  assert.throws(() => captures.findOne(capture.id), hasStatus(404));
});

test('requires an explicitly selected or configured Gemini model before making a request', async (t) => {
  env(t, { GEMINI_MODEL: undefined });
  let calls = 0;
  t.mock.method(global, 'fetch', () => { calls++; throw new Error('Must not call provider'); });
  const captures = service();
  const capture = captures.create({ text: 'Mua sách', mode: 'text' });
  await assert.rejects(captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key' }), hasStatus(400));
  assert.equal(calls, 0);
  assert.equal(captures.findOne(capture.id).status, 'draft');
});

test('uses configured model, bounds the request and normalizes Gemini deadlines', async (t) => {
  env(t, { GEMINI_MODEL: 'configured-model', GEMINI_TIMEOUT_MS: '1000' });
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.match(url, /\/configured-model:generateContent$/);
    assert.ok(options.signal instanceof AbortSignal);
    assert.deepEqual(JSON.parse(options.body).generationConfig, { responseMimeType: 'application/json' });
    return geminiResponse([{ title: 'Họp nhóm', due: '2026-11-10T09:00:00+07:00', hasTime: true, priority: 'high', minutes: 30 }]);
  });
  const captures = service();
  const capture = captures.create({ text: 'Ngày 10/11 họp lúc 9h', mode: 'text' });
  const parsed = await captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key' });
  assert.equal(parsed.drafts[0].due, '2026-11-10T02:00:00.000Z');
  assert.equal(parsed.drafts[0].hasTime, true);
});

test('a Gemini timeout while reading the body unlocks capture for retry', async (t) => {
  env(t, { GEMINI_TIMEOUT_MS: '20' });
  t.mock.method(global, 'fetch', async (_url, options) => ({
    ok: true,
    json: () => new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve({}), 1000);
      const abort = () => { clearTimeout(timer); reject(options.signal.reason); };
      if (options.signal.aborted) abort(); else options.signal.addEventListener('abort', abort, { once: true });
    }),
  }));
  const captures = service();
  const capture = captures.create({ text: 'Mua sách', mode: 'text' });
  await assert.rejects(captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key', model: 'test-model' }), hasStatus(504));
  assert.equal(captures.findOne(capture.id).status, 'draft');
  assert.deepEqual(captures.findOne(capture.id).drafts, []);
  assert.equal((await captures.parse(capture.id, { engine: 'local' })).status, 'review');
});

test('invalid Gemini output and provider failures keep capture retryable', async (t) => {
  const captures = service();
  const capture = captures.create({ text: 'Mua sách', mode: 'text' });
  t.mock.method(global, 'fetch', async () => geminiResponse([null]));
  await assert.rejects(captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key', model: 'test-model' }), hasStatus(400));
  assert.equal(captures.findOne(capture.id).status, 'draft');
  global.fetch = async () => ({ ok: false, status: 429 });
  await assert.rejects(captures.parse(capture.id, { engine: 'gemini', apiKey: 'local-test-key', model: 'test-model' }), hasStatus(400));
  assert.equal(captures.findOne(capture.id).status, 'draft');
});
