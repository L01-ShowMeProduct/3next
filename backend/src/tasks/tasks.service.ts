import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { rankTasks } from './ranking';
import { RankedTask, Task, TaskPriority, TaskStatus } from './task.types';

/**
 * Lưu task trong bộ nhớ. Dữ liệu mất khi server khởi động lại.
 * Đủ cho bản demo và test API. Khi nối Firestore, chỉ cần thay phần lưu trữ trong service này.
 */
@Injectable()
export class TasksService implements OnModuleInit {
  private readonly tasks = new Map<string, Task>();

  onModuleInit(): void {
    if (process.env.SEED_DEMO_DATA !== 'false') this.seedDemoData();
  }

  create(dto: CreateTaskDto, captureId: string | null = null): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: dto.title.trim(),
      deadline: dto.deadline ? new Date(dto.deadline).toISOString() : null,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      captureId,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  findAll(query: ListTasksQueryDto = {}): Task[] {
    return [...this.tasks.values()]
      .filter((t) => !query.status || t.status === query.status)
      .filter((t) => !query.priority || t.priority === query.priority)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findOne(id: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new NotFoundException(`Không tìm thấy task ${id}`);
    return task;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.findOne(id);
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.deadline !== undefined) {
      task.deadline = dto.deadline ? new Date(dto.deadline).toISOString() : null;
    }
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined && dto.status !== task.status) {
      task.status = dto.status;
      task.completedAt = dto.status === TaskStatus.DONE ? new Date().toISOString() : null;
    }
    task.updatedAt = new Date().toISOString();
    return task;
  }

  complete(id: string): Task {
    return this.update(id, { status: TaskStatus.DONE });
  }

  remove(id: string): void {
    this.findOne(id);
    this.tasks.delete(id);
  }

  /** Các việc nên làm tiếp theo: chỉ tính task chưa xong, xếp theo điểm giảm dần. */
  top(limit = 3, now: Date = new Date()): RankedTask[] {
    return rankTasks(this.findAll({ status: TaskStatus.TODO }), limit, now);
  }

  /** Xóa toàn bộ dữ liệu, dùng cho test. */
  clear(): void {
    this.tasks.clear();
  }

  private seedDemoData(): void {
    const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
    this.create({ title: 'Nộp báo cáo môn Mobile', deadline: inHours(30), priority: TaskPriority.HIGH });
    this.create({ title: 'Họp nhóm đồ án', deadline: inHours(8), priority: TaskPriority.MEDIUM });
    this.create({ title: 'Mua sách ở Fahasa', deadline: inHours(96), priority: TaskPriority.LOW });
    this.create({ title: 'Ôn bài kiểm tra giữa kỳ', deadline: inHours(150), priority: TaskPriority.MEDIUM });
  }
}
