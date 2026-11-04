import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { APP_ENV, AppEnv } from '../config/env';
import { TaskPriority } from '../tasks/task.types';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';

/**
 * Khi SEED_DEMO_DATA=true: tạo sẵn tài khoản demo kèm vài task để thử Top 3 trên Swagger.
 * Chỉ tạo khi tài khoản demo chưa tồn tại, nên khởi động lại server không nhân đôi dữ liệu.
 */
@Injectable()
export class DemoSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DemoSeedService.name);

  constructor(
    @Inject(APP_ENV) private readonly env: AppEnv,
    private readonly users: UsersService,
    private readonly tasks: TasksService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.env.seedDemoData) return;
    if (!this.env.demoPassword) {
      this.logger.warn('SEED_DEMO_DATA=true nhưng chưa đặt DEMO_PASSWORD trên production, bỏ qua tạo tài khoản demo.');
      return;
    }
    if (await this.users.findByEmail(this.env.demoEmail)) return;

    let user;
    try {
      user = await this.users.create(this.env.demoEmail, await bcrypt.hash(this.env.demoPassword, 10), 'Demo');
    } catch (e: unknown) {
      // Hai instance khởi động cùng lúc: instance kia đã tạo trước, bỏ qua.
      if ((e as { code?: string }).code === '23505') return;
      throw e;
    }
    const inHours = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();
    await this.tasks.create(user.id, { title: 'Nộp báo cáo môn Mobile', deadline: inHours(30), priority: TaskPriority.HIGH });
    await this.tasks.create(user.id, { title: 'Họp nhóm đồ án', deadline: inHours(8), priority: TaskPriority.MEDIUM });
    await this.tasks.create(user.id, { title: 'Mua sách ở Fahasa', deadline: inHours(96), priority: TaskPriority.LOW });
    await this.tasks.create(user.id, { title: 'Ôn bài kiểm tra giữa kỳ', deadline: inHours(150), priority: TaskPriority.MEDIUM });
    this.logger.log(`Đã tạo tài khoản demo ${this.env.demoEmail} kèm 4 task mẫu`);
  }
}
