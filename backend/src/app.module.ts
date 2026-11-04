import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CapturesModule } from './captures/captures.module';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DemoSeedService } from './database/demo-seed.service';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AppConfigModule, DatabaseModule, UsersModule, AuthModule, TasksModule, CapturesModule],
  controllers: [AppController],
  providers: [DemoSeedService],
})
export class AppModule {}
