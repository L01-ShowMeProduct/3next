export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskStatus {
  TODO = 'todo',
  DONE = 'done',
}

export interface Task {
  id: string;
  title: string;
  /** Hạn chót, định dạng ISO 8601. null nếu không có hạn. */
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  /** Id của capture đã tạo ra task này (nếu có). */
  captureId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface RankedTask {
  task: Task;
  score: number;
  reason: string;
}
