import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { Task } from '../tasks/task.types';
import { TasksService } from '../tasks/tasks.service';
import { Capture, CaptureSource, CaptureStatus } from './capture.types';
import { CreateCaptureDto } from './dto/create-capture.dto';
import { ListCapturesQueryDto } from './dto/list-captures-query.dto';
import { parseVietnameseTasks } from './parser/vi-task-parser';

@Injectable()
export class CapturesService {
  private readonly captures = new Map<string, Capture>();

  constructor(private readonly tasksService: TasksService) {}

  /** Nhận một câu, tách thành các task nháp. Chưa tạo task thật, chờ người dùng xác nhận. */
  create(dto: CreateCaptureDto): Capture {
    const drafts = parseVietnameseTasks(dto.text);
    if (drafts.length === 0) {
      throw new UnprocessableEntityException(
        'Không tách được việc nào từ nội dung này. Hãy thử viết rõ hơn, ví dụ "Mai nộp báo cáo".',
      );
    }
    const now = new Date().toISOString();
    const capture: Capture = {
      id: randomUUID(),
      rawText: dto.text.trim(),
      source: dto.source ?? CaptureSource.TEXT,
      status: CaptureStatus.PENDING,
      drafts,
      taskIds: [],
      createdAt: now,
      updatedAt: now,
    };
    this.captures.set(capture.id, capture);
    return capture;
  }

  findAll(query: ListCapturesQueryDto = {}): Capture[] {
    return [...this.captures.values()]
      .filter((c) => !query.status || c.status === query.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  findOne(id: string): Capture {
    const capture = this.captures.get(id);
    if (!capture) throw new NotFoundException(`Không tìm thấy capture ${id}`);
    return capture;
  }

  /** Người dùng xác nhận (có thể đã sửa) rồi mới lưu thành task thật. */
  confirm(id: string, edited?: CreateTaskDto[]): { capture: Capture; tasks: Task[] } {
    const capture = this.findOne(id);
    this.assertPending(capture, 'xác nhận');
    const source = edited ?? capture.drafts;
    const tasks = source.map((t) =>
      this.tasksService.create({ title: t.title, deadline: t.deadline, priority: t.priority }, capture.id),
    );
    capture.status = CaptureStatus.CONFIRMED;
    capture.taskIds = tasks.map((t) => t.id);
    capture.updatedAt = new Date().toISOString();
    return { capture, tasks };
  }

  /** Bỏ qua capture, không lưu task nào. */
  discard(id: string): Capture {
    const capture = this.findOne(id);
    this.assertPending(capture, 'bỏ qua');
    capture.status = CaptureStatus.DISCARDED;
    capture.updatedAt = new Date().toISOString();
    return capture;
  }

  clear(): void {
    this.captures.clear();
  }

  private assertPending(capture: Capture, action: string): void {
    if (capture.status !== CaptureStatus.PENDING) {
      throw new ConflictException(`Capture đã ở trạng thái "${capture.status}", không thể ${action}.`);
    }
  }
}
