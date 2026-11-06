require('reflect-metadata');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { configureApp } = require('../dist/setup');
let app;
let base;
before(async () => {
  app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app?.close(); });
async function request(method, route, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() };
}

test('healthz passes deploy checks without advertising the legacy widget API', async () => {
  const health = await request('GET', '/healthz');
  assert.equal(health.status, 200);
  assert.equal(health.body.service, '3next-api');
  assert.equal((await request('GET', '/health')).status, 404);
  const swagger = await request('GET', '/api-json');
  assert.equal(swagger.status, 200);
  assert.ok(swagger.body.paths['/healthz']);
});

test('widget-compatible capture, parse, confirm, rank and completion flow', async () => {
  const created = await request('POST', '/captures', { text: 'Ngày mai 9h họp nhóm, cuối tuần nộp bài', mode: 'text' });
  assert.equal(created.status, 201);
  const id = created.body.id;
  const parsed = await request('POST', `/captures/${id}/parse`, { engine: 'local' });
  assert.equal(parsed.status, 201);
  assert.equal(parsed.body.drafts.length, 2);
  const stale = await request('POST', `/captures/${id}/confirm`, { selectedIds: ['stale-id'] });
  assert.equal(stale.status, 400);
  assert.equal((await request('GET', `/captures/${id}`)).status, 200);
  const confirmed = await request('POST', `/captures/${id}/confirm`, { selectedIds: parsed.body.drafts.map(d => d.id) });
  assert.equal(confirmed.status, 201);
  assert.equal(confirmed.body.created, 2);
  const ranked = await request('GET', '/tasks?status=open&ranked=true');
  assert.equal(ranked.body.timeSemantics, 'utc');
  assert.ok(Array.isArray(ranked.body.tasks));
  const task = confirmed.body.tasks[0];
  assert.equal((await request('PATCH', `/tasks/${task.id}/status`, { status: 'done' })).body.status, 'done');
  assert.ok(!(await request('GET', '/tasks?status=open&ranked=true')).body.tasks.some(t => t.id === task.id));
});

test('blank content and malformed fields produce client errors', async () => {
  assert.equal((await request('POST', '/captures', { text: '   ', mode: 'text' })).status, 400);
  assert.equal((await request('POST', '/tasks', { title: '   ' })).status, 400);
  assert.equal((await request('POST', '/tasks', { title: 'Task', due: 'not-a-date' })).status, 400);
  assert.equal((await request('POST', '/tasks', { title: 'Task', due: '2026-11-10T09:00:00' })).status, 400);
  assert.equal((await request('POST', '/tasks', { title: 'Task', due: '2026-11-10' })).status, 400);
  const created = await request('POST', '/tasks', { title: 'Valid title' });
  assert.equal((await request('PATCH', `/tasks/${created.body.id}`, { title: null })).status, 400);
});
