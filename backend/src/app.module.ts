import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { CapturesModule } from './captures/captures.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [TasksModule, CapturesModule],
  controllers: [AppController],
})
export class AppModule {}
