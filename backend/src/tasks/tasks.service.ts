import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Task, Priority } from '../shared/types';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';

@Injectable()
export class TasksService {
  /** In-memory store */
  private tasks: Task[] = [];

  // ── Helpers ────────────────────────────────────────────────────────────────

  private find(id: string): Task {
    const t = this.tasks.find((t) => t.id === id);
    if (!t) throw new NotFoundException(`Task "${id}" không tồn tại.`);
    return t;
  }

  private rankValue(t: Task, now: Date): number {
    const hours = t.due
      ? (new Date(t.due).getTime() - now.getTime()) / 3_600_000
      : Infinity;
    return (
      (t.priority === 'high' ? 50 : t.priority === 'medium' ? 20 : 0) +
      (hours < 0 ? 120 : hours <= 6 ? 90 : hours <= 24 ? 60 : hours <= 72 ? 35 : hours <= 168 ? 15 : 0)
    );
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  findAll(status?: string, priority?: string, ranked?: boolean): { tasks: Task[]; total: number } {
    let list = [...this.tasks];

    if (status === 'open' || status === 'done')
      list = list.filter((t) => t.status === status);
    if (priority === 'high' || priority === 'medium' || priority === 'low')
      list = list.filter((t) => t.priority === priority);

    if (ranked) {
      const now = new Date();
      list = list
        .filter((t) => t.status === 'open')
        .sort((a, b) => {
          if (a.manualOrder !== null || b.manualOrder !== null)
            return (a.manualOrder ?? 1e9) - (b.manualOrder ?? 1e9) || a.createdAt.localeCompare(b.createdAt);
          return (
            this.rankValue(b, now) - this.rankValue(a, now) ||
            (a.due ?? '9999').localeCompare(b.due ?? '9999') ||
            a.createdAt.localeCompare(b.createdAt)
          );
        });
    }

    return { tasks: list, total: list.length };
  }

  findOne(id: string): Task {
    return this.find(id);
  }

  create(dto: CreateTaskDto): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: dto.title.trim(),
      due: dto.due ?? null,
      hasTime: dto.hasTime ?? false,
      priority: (dto.priority ?? 'medium') as Priority,
      minutes: dto.minutes ?? null,
      status: 'open',
      createdAt: now,
      completedAt: null,
      sourceId: uuidv4(),
      manualOrder: null,
    };
    this.tasks.push(task);
    return task;
  }

  update(id: string, dto: UpdateTaskDto): Task {
    const task = this.find(id);
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.due !== undefined) task.due = dto.due ?? null;
    if (dto.hasTime !== undefined) task.hasTime = dto.hasTime;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.minutes !== undefined) task.minutes = dto.minutes ?? null;
    return task;
  }

  updateStatus(id: string, status: 'open' | 'done'): Task {
    const task = this.find(id);
    task.status = status;
    task.completedAt = status === 'done' ? new Date().toISOString() : null;
    return task;
  }

  remove(id: string): { message: string } {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new NotFoundException(`Task "${id}" không tồn tại.`);
    this.tasks.splice(idx, 1);
    return { message: `Task "${id}" đã được xoá.` };
  }

  reorder(dto: ReorderTasksDto): { updated: number } {
    let updated = 0;
    for (const item of dto.orders) {
      const task = this.tasks.find((t) => t.id === item.id);
      if (task) {
        task.manualOrder = item.manualOrder;
        updated++;
      }
    }
    return { updated };
  }

  /** Called by CapturesService when user confirms drafts */
  bulkCreate(items: Omit<Task, 'id' | 'createdAt'>[]): Task[] {
    const now = new Date().toISOString();
    const created: Task[] = items.map((item) => ({
      ...item,
      id: uuidv4(),
      createdAt: now,
    }));
    this.tasks.push(...created);
    return created;
  }
}

