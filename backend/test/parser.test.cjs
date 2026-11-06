const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { parseLocal } = require('../dist/shared/parse-local');
const reference = '2026-11-03T07:00:00.000Z';

test('Vietnamese 9am is the same UTC instant across server timezones', () => {
  const modulePath = require.resolve('../dist/shared/parse-local');
  const code = `const {parseLocal}=require(${JSON.stringify(modulePath)}); console.log(JSON.stringify(parseLocal('Mai họp nhóm lúc 9 giờ', ${JSON.stringify(reference)})));`;
  for (const TZ of ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York']) {
    const [draft] = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ }, encoding: 'utf8' }));
    assert.equal(draft.due, '2026-11-04T02:00:00.000Z', TZ);
    assert.equal(draft.title, 'Họp nhóm');
    assert.equal(draft.hasTime, true);
  }
});

test('today and tomorrow use the Vietnamese date after local midnight', () => {
  const afterMidnight = '2026-11-03T18:30:00.000Z';
  assert.equal(parseLocal('Hôm nay họp nhóm lúc 9 giờ', afterMidnight)[0].due, '2026-11-04T02:00:00.000Z');
  assert.equal(parseLocal('Mai họp nhóm lúc 9 giờ', afterMidnight)[0].due, '2026-11-05T02:00:00.000Z');
});

test('splits README tasks with separate relative dates and times', () => {
  const drafts = parseLocal('Ngày mai 9h họp nhóm, cuối tuần nộp bài', reference);
  assert.deepEqual(drafts.map(d => d.title), ['Họp nhóm', 'Nộp bài']);
  assert.deepEqual(drafts.map(d => d.due), ['2026-11-04T02:00:00.000Z', '2026-11-08T16:59:00.000Z']);
  assert.deepEqual(drafts.map(d => d.hasTime), [true, false]);
});

test('recognizes time before verbs, conjunctions, unaccented and decomposed text', () => {
  assert.equal(parseLocal('Mua sách, mai 9h họp nhóm và cuối tuần nộp bài', reference).length, 3);
  assert.equal(parseLocal('ngay mai hop nhom luc 3 gio chieu', reference)[0].due, '2026-11-04T08:00:00.000Z');
  assert.equal(parseLocal('Mai họp nhóm lúc 9 giờ'.normalize('NFD'), reference)[0].title, 'Họp nhóm');
});

test('preserves shopping lists while splitting actual new actions', () => {
  assert.equal(parseLocal('Mua sách, bút, giấy và vở', reference).length, 1);
  assert.equal(parseLocal('Mua sách và đọc tài liệu', reference).length, 2);
});

test('keeps weekday and next-week calendar semantics', () => {
  assert.equal(parseLocal('Thứ 2 tuần sau nộp bài', reference)[0].due, '2026-11-09T16:59:00.000Z');
  assert.equal(parseLocal('Chủ nhật dọn phòng', reference)[0].due, '2026-11-08T16:59:00.000Z');
});

test('rolls missing years forward and warns instead of rolling invalid dates', () => {
  assert.equal(parseLocal('Nộp học phí 1/3', reference)[0].due, '2027-03-01T16:59:00.000Z');
  assert.equal(parseLocal('Nộp học phí 1/3/2025', reference)[0].due, '2025-03-01T16:59:00.000Z');
  const invalid = parseLocal('Nộp bài 31/11', reference)[0];
  assert.equal(invalid.due, null);
  assert.ok(invalid.warning);
});

test('does not invent dates and keeps low-priority negation', () => {
  const task = parseLocal('Đọc sách không gấp trong 30 phút', reference)[0];
  assert.equal(task.due, null);
  assert.equal(task.priority, 'low');
  assert.equal(task.minutes, 30);
  const timeOnly = parseLocal('Họp lúc 9 giờ', reference)[0];
  assert.equal(timeOnly.due, null);
  assert.ok(timeOnly.warning);
});
