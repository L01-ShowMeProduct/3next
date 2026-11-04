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
import { CaptureEntity } from '../captures/capture.entity';
import { UserEntity } from '../users/user.entity';
import { Task, TaskPriority, TaskStatus } from './task.types';

@Entity({ name: 'tasks' })
@Index('IDX_tasks_user_status', ['userId', 'status'])
@Index('IDX_tasks_capture', ['captureId'])
@Check('CHK_tasks_priority', `"priority" IN ('high', 'medium', 'low')`)
@Check('CHK_tasks_status', `"status" IN ('todo', 'done')`)
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_tasks' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_tasks_user' })
  user?: UserEntity;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'timestamptz', nullable: true })
  deadline!: Date | null;

  @Column({ type: 'varchar', length: 16, default: TaskPriority.MEDIUM })
  priority!: TaskPriority;

  @Column({ type: 'varchar', length: 16, default: TaskStatus.TODO })
  status!: TaskStatus;

  /** Capture đã tạo ra task này. Xóa capture thì giữ task, chỉ bỏ liên kết. */
  @Column({ name: 'capture_id', type: 'uuid', nullable: true })
  captureId!: string | null;

  @ManyToOne(() => CaptureEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'capture_id', foreignKeyConstraintName: 'FK_tasks_capture' })
  capture?: CaptureEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;
}

/** Đổi entity sang dạng API trả về (ngày giờ dạng chuỗi ISO), giữ nguyên hợp đồng API cũ. */
export function toTask(e: TaskEntity): Task {
  return {
    id: e.id,
    title: e.title,
    deadline: e.deadline ? e.deadline.toISOString() : null,
    priority: e.priority,
    status: e.status,
    captureId: e.captureId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
  };
}
