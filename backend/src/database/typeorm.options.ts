import { DataSourceOptions } from 'typeorm';
import { RefreshTokenEntity } from '../auth/refresh-token.entity';
import { CaptureEntity } from '../captures/capture.entity';
import { AppEnv } from '../config/env';
import { TaskEntity } from '../tasks/task.entity';
import { UserEntity } from '../users/user.entity';
import { InitSchema1730700000000 } from './migrations/1730700000000-InitSchema';

export const ENTITIES = [UserEntity, RefreshTokenEntity, TaskEntity, CaptureEntity];

/** Liệt kê migration tường minh (không dùng glob) để chạy giống nhau ở ts-node, jest và bản build. */
export const MIGRATIONS = [InitSchema1730700000000];

/** Cấu hình dùng chung cho server (Nest) và CLI migration (data-source.ts). */
export function buildDataSourceOptions(env: Pick<AppEnv, 'databaseUrl' | 'databaseSsl'>): DataSourceOptions {
  return {
    type: 'postgres',
    url: env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsTableName: 'migrations',
    // Không bao giờ để TypeORM tự sửa schema: mọi thay đổi đi qua migration để cả nhóm có cùng schema.
    synchronize: false,
    logging: ['error', 'warn'],
  };
}
