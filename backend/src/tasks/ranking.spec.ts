import { rankTask, rankTasks } from './ranking';
import { Task, TaskPriority, TaskStatus } from './task.types';

const NOW = new Date('2026-11-03T07:00:00.000Z');

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'id',
    title: 'Task',
    deadline: null,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.TODO,
    captureId: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    completedAt: null,
    ...overrides,
  };
}

const inHours = (h: number) => new Date(NOW.getTime() + h * 3600_000).toISOString();

describe('ranking', () => {
  it('việc quá hạn có điểm cao nhất về độ gấp', () => {
    const overdue = rankTask(makeTask({ deadline: inHours(-2) }), NOW);
    const soon = rankTask(makeTask({ deadline: inHours(5) }), NOW);
    expect(overdue.score).toBeGreaterThan(soon.score);
    expect(overdue.reason).toContain('đã quá hạn');
  });

  it('deadline gần hơn thì xếp trước khi cùng mức ưu tiên', () => {
    const ranked = rankTasks(
      [makeTask({ id: 'far', deadline: inHours(100) }), makeTask({ id: 'near', deadline: inHours(6) })],
      3,
      NOW,
    );
    expect(ranked.map((r) => r.task.id)).toEqual(['near', 'far']);
  });

  it('mức ưu tiên cao có thể đẩy việc lên trước', () => {
    const ranked = rankTasks(
      [
        makeTask({ id: 'low', deadline: inHours(20), priority: TaskPriority.LOW }),
        makeTask({ id: 'high', deadline: inHours(24), priority: TaskPriority.HIGH }),
      ],
      3,
      NOW,
    );
    expect(ranked[0].task.id).toBe('high');
  });

  it('việc không có deadline xếp sau việc có deadline gần', () => {
    const ranked = rankTasks([makeTask({ id: 'none' }), makeTask({ id: 'dl', deadline: inHours(10) })], 3, NOW);
    expect(ranked[0].task.id).toBe('dl');
    expect(ranked[1].reason).toContain('chưa có deadline');
  });

  it('giới hạn số lượng trả về', () => {
    const tasks = Array.from({ length: 6 }, (_, i) => makeTask({ id: `t${i}`, deadline: inHours(i + 1) }));
    expect(rankTasks(tasks, 3, NOW)).toHaveLength(3);
  });
});
