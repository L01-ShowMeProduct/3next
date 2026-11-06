import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { CapturesModule } from './captures/captures.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TasksModule, CapturesModule],
  controllers: [HealthController],
})
export class AppModule {}

