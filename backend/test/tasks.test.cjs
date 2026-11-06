require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TasksService } = require('../dist/tasks/tasks.service');

test('normalizes ISO offsets and ranks the earlier deadline first', () => {
  const service = new TasksService();
  const early = new Date(Date.now() + 48 * 3600_000);
  const offset = new Date(early.getTime() + 7 * 3600_000).toISOString().replace('Z', '+07:00');
  const first = service.create({ title: 'Earlier', due: offset, priority: 'medium' });
  const second = service.create({ title: 'Later', due: new Date(early.getTime() + 3600_000).toISOString(), priority: 'medium' });
  assert.equal(first.due, early.toISOString());
  assert.deepEqual(service.findAll('open', undefined, true).tasks.map(t => t.id), [first.id, second.id]);
  assert.equal(service.findAll().timeSemantics, 'utc');
});

test('normalizes updates, clears hasTime with due, and excludes completed tasks', () => {
  const service = new TasksService();
  const task = service.create({ title: 'Task', due: '2026-11-10T09:00:00+07:00', hasTime: true });
  service.update(task.id, { due: '2026-11-11T10:00:00+07:00' });
  assert.equal(task.due, '2026-11-11T03:00:00.000Z');
  service.update(task.id, { due: null });
  assert.equal(task.hasTime, false);
  service.updateStatus(task.id, 'done');
  assert.equal(service.findAll('open', undefined, true).total, 0);
});

test('manual order still overrides automatic ranking', () => {
  const service = new TasksService();
  const first = service.create({ title: 'Urgent', priority: 'high' });
  const second = service.create({ title: 'Pinned', priority: 'low' });
  service.reorder({ orders: [{ id: second.id, manualOrder: 0 }] });
  assert.deepEqual(service.findAll('open', undefined, true).tasks.map(t => t.id), [second.id, first.id]);
});

test('rejects ambiguous or impossible timestamps before storing a task', () => {
  const service = new TasksService();
  for (const due of ['2026-11-10', '2026-11-10T09:00:00', '2026-11-31T09:00:00Z']) {
    assert.throws(() => service.create({ title: 'Task', due }), error => error.getStatus?.() === 400);
  }
  assert.equal(service.findAll().total, 0);
  const task = service.create({ title: 'Original title' });
  assert.throws(() => service.update(task.id, { title: 'Changed title', due: '2026-11-10T09:00:00' }), error => error.getStatus?.() === 400);
  assert.equal(task.title, 'Original title');
});
