import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { CreateTaskDto } from '../tasks/dto/create-task.dto';
import { Task } from '../tasks/task.types';
import { TasksService } from '../tasks/tasks.service';
import { CaptureEntity, toCapture } from './capture.entity';
import { Capture, CaptureSource, CaptureStatus } from './capture.types';
import { CreateCaptureDto } from './dto/create-capture.dto';
import { ListCapturesQueryDto } from './dto/list-captures-query.dto';
import { parseVietnameseTasks } from './parser/vi-task-parser';

@Injectable()
export class CapturesService {
  constructor(
    @InjectRepository(CaptureEntity) private readonly repo: Repository<CaptureEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tasksService: TasksService,
  ) {}

  /** Nhận một câu, tách thành các task nháp. Chưa tạo task thật, chờ người dùng xác nhận. */
  async create(userId: string, dto: CreateCaptureDto): Promise<Capture> {
    const drafts = parseVietnameseTasks(dto.text);
    if (drafts.length === 0) {
      throw new UnprocessableEntityException(
        'Không tách được việc nào từ nội dung này. Hãy thử viết rõ hơn, ví dụ "Mai nộp báo cáo".',
      );
    }
    const entity = this.repo.create({
      userId,
      rawText: dto.text.trim(),
      source: dto.source ?? CaptureSource.TEXT,
      status: CaptureStatus.PENDING,
      drafts,
      taskIds: [],
    });
    return toCapture(await this.repo.save(entity));
  }

  async findAll(userId: string, query: ListCapturesQueryDto = {}): Promise<Capture[]> {
    const where: FindOptionsWhere<CaptureEntity> = { userId };
    if (query.status) where.status = query.status;
    const rows = await this.repo.find({ where, order: { createdAt: 'DESC', id: 'ASC' } });
    return rows.map(toCapture);
  }

  async findOne(userId: string, id: string): Promise<Capture> {
    return toCapture(await this.findEntity(userId, id));
  }

  /**
   * Người dùng xác nhận (có thể đã sửa) rồi mới lưu thành task thật.
   * Chạy trong một transaction và khóa dòng capture (SELECT ... FOR UPDATE):
   * hoặc lưu đủ mọi task và đổi trạng thái, hoặc không lưu gì. Hai request xác nhận cùng lúc
   * thì request sau phải chờ và sẽ nhận 409, không tạo task trùng.
   */
  async confirm(userId: string, id: string, edited?: CreateTaskDto[]): Promise<{ capture: Capture; tasks: Task[] }> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CaptureEntity);
      const capture = await repo.findOne({ where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!capture) throw new NotFoundException(`Không tìm thấy capture ${id}`);
      this.assertPending(capture, 'xác nhận');

      const source = edited ?? capture.drafts;
      const tasks: Task[] = [];
      for (const t of source) {
        tasks.push(
          await this.tasksService.create(
            userId,
            { title: t.title, deadline: t.deadline, priority: t.priority },
            capture.id,
            manager,
          ),
        );
      }
      capture.status = CaptureStatus.CONFIRMED;
      capture.taskIds = tasks.map((t) => t.id);
      return { capture: toCapture(await repo.save(capture)), tasks };
    });
  }

  /** Bỏ qua capture, không lưu task nào. */
  async discard(userId: string, id: string): Promise<Capture> {
    const capture = await this.findEntity(userId, id);
    this.assertPending(capture, 'bỏ qua');
    // Cập nhật có điều kiện status = pending để không ghi đè một lần xác nhận chạy song song.
    const res = await this.repo.update({ id, userId, status: CaptureStatus.PENDING }, { status: CaptureStatus.DISCARDED });
    if (!res.affected) throw new ConflictException('Capture vừa được xử lý ở nơi khác, không thể bỏ qua.');
    return toCapture(await this.findEntity(userId, id));
  }

  private async findEntity(userId: string, id: string): Promise<CaptureEntity> {
    const capture = await this.repo.findOneBy({ id, userId });
    if (!capture) throw new NotFoundException(`Không tìm thấy capture ${id}`);
    return capture;
  }

  private assertPending(capture: CaptureEntity, action: string): void {
    if (capture.status !== CaptureStatus.PENDING) {
      throw new ConflictException(`Capture đã ở trạng thái "${capture.status}", không thể ${action}.`);
    }
  }
}
