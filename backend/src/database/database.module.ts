import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_ENV, AppEnv } from '../config/env';
import { buildDataSourceOptions } from './typeorm.options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => ({
        ...buildDataSourceOptions(env),
        // Deploy lên Render chỉ cần push code: server tự đưa schema lên bản mới nhất khi khởi động.
        migrationsRun: env.runMigrations,
        // Lần đầu server cloud (Render) khởi động có thể chờ database lâu hơn bình thường.
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
