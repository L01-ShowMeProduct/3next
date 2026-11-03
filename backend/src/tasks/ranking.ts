import { RankedTask, Task, TaskPriority } from './task.types';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 30,
  [TaskPriority.MEDIUM]: 15,
  [TaskPriority.LOW]: 0,
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: 'mức ưu tiên cao',
  [TaskPriority.MEDIUM]: 'mức ưu tiên trung bình',
  [TaskPriority.LOW]: 'mức ưu tiên thấp',
};

const HOUR_MS = 60 * 60 * 1000;

/** Mô tả khoảng thời gian còn lại bằng tiếng Việt, ví dụ "còn 5 giờ", "còn 3 ngày". */
export function describeTimeLeft(hoursLeft: number): string {
  if (hoursLeft < 1) return 'còn chưa đến 1 giờ';
  if (hoursLeft < 24) return `còn khoảng ${Math.round(hoursLeft)} giờ`;
  return `còn khoảng ${Math.round(hoursLeft / 24)} ngày`;
}

/**
 * Chấm điểm một task. Điểm càng cao càng nên làm trước.
 * Công thức (bản MVP, đơn giản): độ gấp theo deadline (tối đa 100) + trọng số ưu tiên (0 đến 30).
 */
export function rankTask(task: Task, now: Date = new Date()): RankedTask {
  const priorityScore = PRIORITY_WEIGHT[task.priority];
  let urgencyScore = 5;
  let timeReason = 'chưa có deadline';

  if (task.deadline) {
    const hoursLeft = (new Date(task.deadline).getTime() - now.getTime()) / HOUR_MS;
    if (hoursLeft <= 0) {
      urgencyScore = 100;
      timeReason = 'đã quá hạn';
    } else {
      urgencyScore = Math.max(0, 80 - hoursLeft * 0.5);
      timeReason = `deadline ${describeTimeLeft(hoursLeft)}`;
    }
  }

  const score = Math.round((urgencyScore + priorityScore) * 10) / 10;
  return {
    task,
    score,
    reason: `Xếp trước vì ${timeReason}, ${PRIORITY_LABEL[task.priority]}.`,
  };
}

/** Lấy các task chưa xong có điểm cao nhất. */
export function rankTasks(tasks: Task[], limit: number, now: Date = new Date()): RankedTask[] {
  return tasks
    .map((t) => rankTask(t, now))
    .sort((a, b) => b.score - a.score || a.task.createdAt.localeCompare(b.task.createdAt))
    .slice(0, limit);
}
