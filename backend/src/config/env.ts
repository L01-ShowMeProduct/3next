/**
 * Đọc và kiểm tra biến môi trường ở một chỗ duy nhất.
 * Thiếu biến bắt buộc thì server dừng ngay lúc khởi động, thay vì lỗi lung tung lúc chạy.
 */

const DEV_JWT_SECRET = 'dev-only-secret-change-me-dev-only-secret';

export interface AppEnv {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  /** Bật SSL khi nối Postgres (cần cho phần lớn dịch vụ cloud khi nối từ ngoài). */
  databaseSsl: boolean;
  /** Tự chạy migration khi server khởi động. */
  runMigrations: boolean;
  jwtSecret: string;
  /** Thời gian sống của access token, tính bằng giây. */
  accessTokenTtlSeconds: number;
  /** Thời gian sống của refresh token, tính bằng ngày. */
  refreshTokenTtlDays: number;
  seedDemoData: boolean;
  demoEmail: string;
  /** null khi chạy production mà không đặt DEMO_PASSWORD: khi đó không tạo tài khoản demo. */
  demoPassword: string | null;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function positiveInt(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Biến môi trường ${name} phải là số nguyên dương, đang là "${value}"`);
  return n;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = source.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const databaseUrl = source.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'Thiếu DATABASE_URL. Chạy Postgres bằng "docker compose up -d db" rồi copy backend/.env.example thành backend/.env.',
    );
  }

  const jwtSecret = source.JWT_SECRET || (isProd ? '' : DEV_JWT_SECRET);
  if (!jwtSecret) throw new Error('Thiếu JWT_SECRET. Trên production bắt buộc phải đặt biến này.');
  if (isProd && (jwtSecret === DEV_JWT_SECRET || jwtSecret.length < 32)) {
    throw new Error('JWT_SECRET trên production phải dài ít nhất 32 ký tự và không dùng giá trị mặc định.');
  }

  return {
    nodeEnv,
    port: positiveInt('PORT', source.PORT, 3000),
    databaseUrl,
    databaseSsl: bool(source.DATABASE_SSL, false),
    runMigrations: bool(source.DB_RUN_MIGRATIONS, true),
    jwtSecret,
    accessTokenTtlSeconds: positiveInt('JWT_ACCESS_TTL_SECONDS', source.JWT_ACCESS_TTL_SECONDS, 15 * 60),
    refreshTokenTtlDays: positiveInt('REFRESH_TOKEN_TTL_DAYS', source.REFRESH_TOKEN_TTL_DAYS, 30),
    seedDemoData: bool(source.SEED_DEMO_DATA, false),
    demoEmail: (source.DEMO_EMAIL || 'demo@3next.app').trim().toLowerCase(),
    // Mật khẩu mặc định chỉ dùng cho máy dev. Trên production phải tự đặt, không thì bỏ qua seed.
    demoPassword: source.DEMO_PASSWORD || (isProd ? null : 'demo12345'),
  };
}

/** Token DI để inject cấu hình đã kiểm tra vào service. */
export const APP_ENV = Symbol('APP_ENV');
