import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { CapturesController } from './captures.controller';
import { CapturesService } from './captures.service';

@Module({
  imports: [TasksModule],
  controllers: [CapturesController],
  providers: [CapturesService],
})
export class CapturesModule {}
