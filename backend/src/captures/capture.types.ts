import { ParsedTask } from './parser/vi-task-parser';

export enum CaptureSource {
  TEXT = 'text',
  VOICE = 'voice',
}

export enum CaptureStatus {
  /** AI đã tách xong, đang chờ người dùng xác nhận hoặc sửa. */
  PENDING = 'pending',
  /** Người dùng đã xác nhận, các task đã được lưu. */
  CONFIRMED = 'confirmed',
  /** Người dùng bỏ qua capture này. */
  DISCARDED = 'discarded',
}

export interface Capture {
  id: string;
  rawText: string;
  source: CaptureSource;
  status: CaptureStatus;
  /** Các task AI tách ra, chưa được lưu thành task thật cho đến khi xác nhận. */
  drafts: ParsedTask[];
  /** Id các task được tạo khi xác nhận. */
  taskIds: string[];
  createdAt: string;
  updatedAt: string;
}
