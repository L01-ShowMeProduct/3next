import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { rankTasks } from './ranking';
import { TaskEntity, toTask } from './task.entity';
import { RankedTask, Task, TaskPriority, TaskStatus } from './task.types';

/**
 * Lưu task trong PostgreSQL. Mọi hàm đều nhận userId và chỉ đụng tới task của user đó:
 * task của người khác được coi như không tồn tại (404), không lộ việc nó có hay không.
 */
@Injectable()
export class TasksService {
  constructor(@InjectRepository(TaskEntity) private readonly repo: Repository<TaskEntity>) {}

  /** `manager` cho phép gọi trong một transaction (dùng khi xác nhận capture). */
  async create(userId: string, dto: CreateTaskDto, captureId: string | null = null, manager?: EntityManager): Promise<Task> {
    const repo = manager ? manager.getRepository(TaskEntity) : this.repo;
    const entity = repo.create({
      userId,
      title: dto.title.trim(),
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      priority: dto.priority ?? TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      captureId,
      completedAt: null,
    });
    return toTask(await repo.save(entity));
  }

  async findAll(userId: string, query: ListTasksQueryDto = {}): Promise<Task[]> {
    const where: FindOptionsWhere<TaskEntity> = { userId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    const rows = await this.repo.find({ where, order: { createdAt: 'DESC', id: 'ASC' } });
    return rows.map(toTask);
  }

  async findOne(userId: string, id: string): Promise<Task> {
    return toTask(await this.findEntity(userId, id));
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findEntity(userId, id);
    if (dto.title !== undefined) task.title = dto.title.trim();
    if (dto.deadline !== undefined) task.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.status !== undefined && dto.status !== task.status) {
      task.status = dto.status;
      task.completedAt = dto.status === TaskStatus.DONE ? new Date() : null;
    }
    return toTask(await this.repo.save(task));
  }

  complete(userId: string, id: string): Promise<Task> {
    return this.update(userId, id, { status: TaskStatus.DONE });
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.repo.delete({ id, userId });
    if (!res.affected) throw new NotFoundException(`Không tìm thấy task ${id}`);
  }

  /**
   * Các việc nên làm tiếp theo: lấy mọi task chưa xong của user rồi xếp hạng trong code.
   * Số task chưa xong của một sinh viên chỉ cỡ vài chục, nên chấm điểm ở tầng ứng dụng là đủ nhanh
   * và giữ công thức xếp hạng ở một chỗ (ranking.ts), dễ test, dễ giải thích.
   */
  async top(userId: string, limit = 3, now: Date = new Date()): Promise<RankedTask[]> {
    return rankTasks(await this.findAll(userId, { status: TaskStatus.TODO }), limit, now);
  }

  private async findEntity(userId: string, id: string): Promise<TaskEntity> {
    const task = await this.repo.findOneBy({ id, userId });
    if (!task) throw new NotFoundException(`Không tìm thấy task ${id}`);
    return task;
  }
}
