import { loadEnv } from './env';

const DB = 'postgres://u:p@localhost:5432/db';
const STRONG = 'a'.repeat(40);

describe('loadEnv', () => {
  it('thiếu DATABASE_URL thì dừng ngay', () => {
    expect(() => loadEnv({})).toThrow('DATABASE_URL');
  });

  it('máy dev: có giá trị mặc định cho JWT và mật khẩu demo', () => {
    const env = loadEnv({ DATABASE_URL: DB });
    expect(env.jwtSecret.length).toBeGreaterThanOrEqual(32);
    expect(env.demoPassword).toBe('demo12345');
    expect(env).toMatchObject({ port: 3000, accessTokenTtlSeconds: 900, refreshTokenTtlDays: 30, runMigrations: true });
  });

  it('production: bắt buộc JWT_SECRET đủ mạnh', () => {
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: DB })).toThrow('JWT_SECRET');
    expect(() => loadEnv({ NODE_ENV: 'production', DATABASE_URL: DB, JWT_SECRET: 'ngan' })).toThrow('32');
    expect(loadEnv({ NODE_ENV: 'production', DATABASE_URL: DB, JWT_SECRET: STRONG }).jwtSecret).toBe(STRONG);
  });

  it('production: không có DEMO_PASSWORD thì không dùng mật khẩu mặc định', () => {
    const env = loadEnv({ NODE_ENV: 'production', DATABASE_URL: DB, JWT_SECRET: STRONG, SEED_DEMO_DATA: 'true' });
    expect(env.seedDemoData).toBe(true);
    expect(env.demoPassword).toBeNull();
  });

  it('báo lỗi rõ khi số không hợp lệ', () => {
    expect(() => loadEnv({ DATABASE_URL: DB, PORT: 'abc' })).toThrow('PORT');
    expect(() => loadEnv({ DATABASE_URL: DB, JWT_ACCESS_TTL_SECONDS: '-5' })).toThrow('JWT_ACCESS_TTL_SECONDS');
  });

  it('đọc được các cách viết true/false', () => {
    expect(loadEnv({ DATABASE_URL: DB, DATABASE_SSL: 'TRUE' }).databaseSsl).toBe(true);
    expect(loadEnv({ DATABASE_URL: DB, DB_RUN_MIGRATIONS: 'false' }).runMigrations).toBe(false);
  });
});
