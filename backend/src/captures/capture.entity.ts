import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { Capture, CaptureSource, CaptureStatus } from './capture.types';
import { ParsedTask } from './parser/vi-task-parser';

@Entity({ name: 'captures' })
@Index('IDX_captures_user_created', ['userId', 'createdAt'])
@Check('CHK_captures_source', `"source" IN ('text', 'voice')`)
@Check('CHK_captures_status', `"status" IN ('pending', 'confirmed', 'discarded')`)
export class CaptureEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_captures' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_captures_user' })
  user?: UserEntity;

  @Column({ name: 'raw_text', type: 'text' })
  rawText!: string;

  @Column({ type: 'varchar', length: 16, default: CaptureSource.TEXT })
  source!: CaptureSource;

  @Column({ type: 'varchar', length: 16, default: CaptureStatus.PENDING })
  status!: CaptureStatus;

  /** Các task nháp AI tách ra, lưu dạng JSON vì chỉ đọc/ghi cả cụm, không truy vấn từng phần. */
  @Column({ type: 'jsonb' })
  drafts!: ParsedTask[];

  /** Id các task tạo ra lúc xác nhận (giữ đúng như lúc xác nhận, kể cả khi task bị xóa sau đó). */
  @Column({ name: 'task_ids', type: 'uuid', array: true, default: () => "'{}'" })
  taskIds!: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

export function toCapture(e: CaptureEntity): Capture {
  return {
    id: e.id,
    rawText: e.rawText,
    source: e.source,
    status: e.status,
    drafts: e.drafts,
    taskIds: e.taskIds,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
