// Shared types mirrored from mobile/src/types.ts
export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  due: string | null;
  hasTime: boolean;
  priority: Priority;
  minutes: number | null;
  status: 'open' | 'done';
  createdAt: string;
  completedAt: string | null;
  sourceId: string;
  manualOrder: number | null;
}

export interface TaskDraft {
  id: string;
  title: string;
  due: string | null;
  hasTime: boolean;
  priority: Priority;
  minutes: number | null;
  selected: boolean;
  warning?: string;
}

export interface Capture {
  id: string;
  text: string;
  capturedAt: string;
  mode: 'text' | 'voice';
  status: 'draft' | 'pending' | 'review';
  drafts: TaskDraft[];
  engine?: 'local' | 'gemini';
}

