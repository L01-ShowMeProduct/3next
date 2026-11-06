import { BadRequestException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';

/** Date-only and offset-free values are ambiguous across server timezones. */
export function normalizeDue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || !isISO8601(value, { strict: true }) || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value))
    throw new BadRequestException('Thời hạn phải là ISO 8601 có múi giờ Z hoặc offset, hoặc null.');
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new BadRequestException('Thời hạn không hợp lệ.');
  return new Date(timestamp).toISOString();
}
