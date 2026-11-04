/**
 * DataSource cho TypeORM CLI (tạo và chạy migration bằng tay).
 * Ví dụ: npm run migration:run, npm run migration:generate -- src/database/migrations/TenThayDoi
 */
import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { loadDotEnv } from '../config/dotenv';
import { buildDataSourceOptions } from './typeorm.options';

// CLI không chạy qua Nest nên tự đọc backend/.env.
loadDotEnv(join(__dirname, '..', '..', '.env'));

if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL (đặt trong backend/.env)');

export default new DataSource(
  buildDataSourceOptions({
    databaseUrl: process.env.DATABASE_URL,
    databaseSsl: ['1', 'true', 'yes', 'on'].includes((process.env.DATABASE_SSL ?? '').toLowerCase()),
  }),
);
