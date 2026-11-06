import { Module } from '@nestjs/common';
import { CapturesController } from './captures.controller';
import { CapturesService } from './captures.service';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  controllers: [CapturesController],
  providers: [CapturesService],
})
export class CapturesModule {}

