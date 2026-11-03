import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { CapturesModule } from './captures/captures.module';

@Module({
  imports: [TasksModule, CapturesModule],
})
export class AppModule {}

