import { TaskPriority } from '../../tasks/task.types';

export interface ParsedTask {
  title: string;
  /** ISO 8601, null nếu câu không nhắc đến thời gian. */
  deadline: string | null;
  priority: TaskPriority;
}

/**
 * Bộ tách task từ câu tiếng Việt, dựa trên quy tắc đơn giản (không dùng LLM).
 * Hiểu: hôm nay, mai, mốt, thứ 2 đến chủ nhật, tuần sau, ngày dd/mm(/yyyy), giờ như "9 giờ", "7h30", "3h chiều".
 * Các lời nói không có mốc thời gian thì deadline để trống, không tự đoán.
 * Dùng múi giờ Việt Nam (UTC+7). Có thể thay bằng LLM sau này mà không đổi API.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Biên từ cho tiếng Việt (\b của JS không hiểu chữ có dấu). */
const word = (pattern: string, flags = 'iu') =>
  new RegExp(`(?<![\\p{L}\\d])(?:${pattern})(?![\\p{L}\\d])`, flags);

const RE_DMY = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
const RE_TIME = /(?:(?:lúc|luc)\s*)?(\d{1,2})\s*(?:(?:giờ|gio)(?![\p{L}])|h(?![\p{L}])|:)\s*(\d{1,2})?(?:\s*(?:phút|phut))?/iu;
const RE_PERIOD = word('sáng|trưa|chiều|tối|đêm|sang|trua|chieu');
const RE_TODAY = word('hôm nay|hom nay');
const RE_TOMORROW = word('ngày mai|ngay mai|mai');
const RE_AFTER_TOMORROW = word('ngày mốt|ngày kia|ngày kìa|mốt');
const RE_NEXT_WEEK = word('tuần sau|tuần tới|tuan sau|tuan toi');
const RE_WEEKDAY = new RegExp(
  '(?<![\\p{L}\\d])(?:(?:thứ|thu)\\s*(hai|ba|tư|năm|sáu|bảy|2|3|4|5|6|7)|(chủ nhật|chu nhat|cn))(?![\\p{L}\\d])',
  'iu',
);

const WEEKDAY_INDEX: Record<string, number> = {
  hai: 1, '2': 1, ba: 2, '3': 2, tư: 3, '4': 3, năm: 4, '5': 4, sáu: 5, '6': 5, bảy: 6, '7': 6,
};

const RE_LOW = word('không gấp|khong gap|khi rảnh|khi ranh|khi nào rảnh|khi nao ranh|rảnh thì|ranh thi|nhẹ nhàng|nhe nhang');
const RE_HIGH = word('gấp|gap|khẩn|khan|quan trọng|quan trong|ngay lập tức|ngay lap tuc|asap|urgent');

const LEADING_FILLER = /^(?:nhớ|phải|cần|nhắc(?:\s*(?:tôi|mình))?|đừng quên|tôi|mình|vào|lúc|trước|hạn|đến|là)\s+/iu;
const TRAILING_FILLER = /\s+(?:trước|vào|lúc|đến|hạn|là|nhé|nha)$/iu;

/** Cắt câu thành các mệnh đề: theo dấu câu và các từ nối như "và", "rồi", "sau đó". */
function splitClauses(text: string): string[] {
  return text
    .split(/[,;.\n!?]+/)
    .flatMap((part) => part.split(/\s+(?:và|rồi|sau đó|với lại)\s+/iu))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Lấy match đầu tiên của regex, đồng thời xóa khỏi chuỗi. */
function take(source: string, re: RegExp): { match: RegExpMatchArray | null; rest: string } {
  const match = source.match(re);
  if (!match || match.index === undefined) return { match: null, rest: source };
  return { match, rest: `${source.slice(0, match.index)} ${source.slice(match.index + match[0].length)}` };
}

function buildDate(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m, d, h, min) - VN_OFFSET_MS);
}

const PERIOD_ALIAS: Record<string, string> = { sang: 'sáng', trua: 'trưa', chieu: 'chiều' };

function normalizeHour(hour: number, period: string | undefined): number {
  const lower = period?.toLowerCase();
  const p = lower ? (PERIOD_ALIAS[lower] ?? lower) : undefined;
  if ((p === 'chiều' || p === 'tối') && hour < 12) return hour + 12;
  if (p === 'trưa' && hour <= 5) return hour + 12;
  return hour;
}

function cleanTitle(raw: string): string {
  let title = raw.replace(/\s+/g, ' ').trim();
  let prev = '';
  while (title !== prev) {
    prev = title;
    title = title.replace(LEADING_FILLER, '').replace(TRAILING_FILLER, '').trim();
  }
  title = title.replace(/^[\s\-–:]+|[\s\-–:]+$/g, '');
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : '';
}

function parseClause(clause: string, now: Date): ParsedTask | null {
  let rest = clause;

  const dmy = take(rest, RE_DMY); rest = dmy.rest;
  const time = take(rest, RE_TIME); rest = time.rest;
  const weekday = take(rest, RE_WEEKDAY); rest = weekday.rest;
  const nextWeek = take(rest, RE_NEXT_WEEK); rest = nextWeek.rest;
  const tomorrow = take(rest, RE_TOMORROW); rest = tomorrow.rest;
  const afterTomorrow = take(rest, RE_AFTER_TOMORROW); rest = afterTomorrow.rest;
  const today = take(rest, RE_TODAY); rest = today.rest;

  let hour: number | null = null;
  let minute = 0;
  if (time.match) {
    const h = Number(time.match[1]);
    const mi = time.match[2] ? Number(time.match[2]) : 0;
    const period = take(rest, RE_PERIOD);
    const adjusted = normalizeHour(h, period.match?.[0]);
    if (adjusted <= 23 && mi <= 59) {
      hour = adjusted;
      minute = mi;
      rest = period.rest;
    }
  } else if (dmy.match || weekday.match || tomorrow.match || afterTomorrow.match || today.match) {
    rest = take(rest, RE_PERIOD).rest;
  }

  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = vn.getUTCMonth();
  const d = vn.getUTCDate();
  const wd = vn.getUTCDay();

  let day: Date | null = null; // 0h của ngày đích (giờ VN, biểu diễn bằng UTC)
  if (dmy.match) {
    const dd = Number(dmy.match[1]);
    const mm = Number(dmy.match[2]);
    let year = y;
    if (dmy.match[3]) year = dmy.match[3].length === 2 ? 2000 + Number(dmy.match[3]) : Number(dmy.match[3]);
    let candidate = Date.UTC(year, mm - 1, dd);
    if (!dmy.match[3] && candidate < Date.UTC(y, m, d)) candidate = Date.UTC(year + 1, mm - 1, dd);
    day = new Date(candidate);
  } else if (weekday.match) {
    const target = weekday.match[2] ? 0 : WEEKDAY_INDEX[weekday.match[1].toLowerCase()];
    let offset: number;
    if (nextWeek.match) {
      const toNextMonday = (8 - wd) % 7 || 7;
      offset = toNextMonday + ((target + 6) % 7);
    } else {
      offset = (target - wd + 7) % 7 || 7;
    }
    day = new Date(Date.UTC(y, m, d + offset));
  } else if (afterTomorrow.match) {
    day = new Date(Date.UTC(y, m, d + 2));
  } else if (tomorrow.match) {
    day = new Date(Date.UTC(y, m, d + 1));
  } else if (today.match) {
    day = new Date(Date.UTC(y, m, d));
  } else if (nextWeek.match) {
    day = new Date(Date.UTC(y, m, d + 7));
  }

  let deadline: Date | null = null;
  if (day) {
    deadline = buildDate(
      day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(),
      hour ?? 23, hour === null ? 59 : minute,
    );
  } else if (hour !== null) {
    deadline = buildDate(y, m, d, hour, minute);
    if (deadline.getTime() <= now.getTime()) deadline = buildDate(y, m, d + 1, hour, minute);
  }

  let priority: TaskPriority;
  if (RE_LOW.test(rest)) priority = TaskPriority.LOW;
  else if (RE_HIGH.test(rest)) priority = TaskPriority.HIGH;
  else if (deadline && deadline.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) priority = TaskPriority.HIGH;
  else priority = deadline ? TaskPriority.MEDIUM : TaskPriority.LOW;

  const title = cleanTitle(rest.replace(RE_LOW, ' ').replace(RE_HIGH, ' '));
  if (title.length < 2) return null;

  return { title, deadline: deadline ? deadline.toISOString() : null, priority };
}

export function parseVietnameseTasks(text: string, now: Date = new Date()): ParsedTask[] {
  return splitClauses(text)
    .map((clause) => parseClause(clause, now))
    .filter((t): t is ParsedTask => t !== null);
}
