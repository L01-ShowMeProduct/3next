import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Đọc backend/.env (nếu có) vào process.env. Biến đã có sẵn trong môi trường (Render, Docker) được ưu tiên,
 * không bị ghi đè. Trên server cloud không có file .env thì hàm không làm gì.
 */
export function loadDotEnv(file = join(process.cwd(), '.env')): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
}
