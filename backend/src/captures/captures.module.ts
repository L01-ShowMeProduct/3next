import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksModule } from '../tasks/tasks.module';
import { CaptureEntity } from './capture.entity';
import { CapturesController } from './captures.controller';
import { CapturesService } from './captures.service';

@Module({
  imports: [TasksModule, TypeOrmModule.forFeature([CaptureEntity])],
  controllers: [CapturesController],
  providers: [CapturesService],
})
export class CapturesModule {}
