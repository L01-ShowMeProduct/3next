import { TaskDraft, Priority } from './types';
import { v4 as uuidv4 } from 'uuid';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const days: Record<string, number> = {
  hai: 1, ba: 2, tu: 3, nam: 4, sau: 5, bay: 6,
  '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6,
};

const localDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Deterministic offline extraction – ported from mobile/src/domain.ts
 * Dates are resolved relative to capturedAt, NOT the current server time.
 */
export function parseLocal(raw: string, capturedAt: string): TaskDraft[] {
  const reference = new Date(capturedAt);
  if (Number.isNaN(reference.getTime()))
    throw new Error('Thời điểm ghi không hợp lệ.');

  const text = raw.trim();
  if (!text || text.length > 12000)
    throw new Error('Nhập từ 1 đến 12.000 ký tự để tách việc.');

  const verbs =
    '(?:nop|gui|hop|mua|doc|lam|on|tra|in|sua|viet|goi|dang ky|hoan thanh|chuan bi|bo sung|thanh toan|don|tap|di|lay|kiem tra|tra loi|xem)';

  const chunks = text
    .split(/[;\n]+|[.!?](?=\s|$)/)
    .flatMap((p) => {
      const n = fold(p);
      const cuts = [
        ...n.matchAll(
          new RegExp(
            '(?:,\\s*|\\s+va\\s+)(?=(?:(?:ngay mai|mai|hom nay|toi nay|thu \\w+(?: tuan sau)?)\\s+)?' +
              verbs +
              '\\b)',
            'g',
          ),
        ),
      ];
      let last = 0;
      const out: string[] = [];
      for (const cut of cuts) {
        out.push(p.slice(last, cut.index));
        last = cut.index! + cut[0].length;
      }
      out.push(p.slice(last));
      return out;
    })
    .map((p) => p.trim().replace(/^[,\s]+|[,\s]+$/g, ''))
    .filter((p) => /[\p{L}\p{N}]/u.test(p));

  if (!chunks.length)
    throw new Error('Chưa tìm thấy công việc. Bạn thử viết rõ việc cần làm nhé.');
  if (chunks.length > 60)
    throw new Error('Mỗi lần hãy ghi tối đa 60 công việc.');

  return chunks.map((chunk) => {
    const normalized = fold(chunk);
    let day: Date | null = null;
    let hasTime = false;
    let hour = 23, minute = 59;
    let warning: string | undefined;
    const spans: { start: number; end: number }[] = [];
    const take = (m: RegExpMatchArray | null) => {
      if (m && m.index !== undefined)
        spans.push({ start: m.index, end: m.index + m[0].length });
    };

    const absolute = normalized.match(
      /\b(?:ngay\s+)?(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{4}))?\b/,
    );
    const relative = [
      ...normalized.matchAll(
        /\b(?:ngay kia|ngay mot|hom nay|toi nay|sang nay|chieu nay|trua nay|dem nay|ngay mai|sang mai|chieu mai|toi mai|trua mai|mai)\b/g,
      ),
    ].find(
      (m) =>
        m[0] !== 'mai' ||
        !/(?:cho|ban|chi|anh)\s+$/.test(normalized.slice(0, m.index)),
    ) ?? null;
    const distance = normalized.match(
      /\b(?:sau|trong)\s+(\d{1,3})\s+ngay(?:\s+nua)?\b/,
    );
    const weekday = normalized.match(
      /\b(?:thu\s+(hai|ba|tu|nam|sau|bay|[2-7])|chu nhat)(?:\s+(tuan sau|tuan nay))?\b/,
    );
    const week = normalized.match(/\b(?:cuoi tuan|dau tuan sau)\b/);

    if (absolute) {
      const dd = Number(absolute[1]),
        mm = Number(absolute[2]) - 1,
        yy = Number(absolute[3] || reference.getFullYear());
      const candidate = new Date(yy, mm, dd);
      if (candidate.getDate() === dd && candidate.getMonth() === mm) {
        day = candidate;
        take(absolute);
      } else warning = 'Ngày trong câu chưa hợp lệ; bạn hãy chọn lại.';
    } else if (distance) {
      day = localDay(reference);
      day.setDate(day.getDate() + Number(distance[1]));
      take(distance);
    } else if (relative) {
      day = localDay(reference);
      const delta = /kia|mot/.test(relative[0]) ? 2 : /mai/.test(relative[0]) ? 1 : 0;
      day.setDate(day.getDate() + delta);
      take(relative);
    } else if (weekday) {
      day = localDay(reference);
      const target = weekday[1] ? days[weekday[1]] : 0;
      let delta = (target - day.getDay() + 7) % 7;
      if (weekday[2] === 'tuan sau') {
        const monday = (day.getDay() + 6) % 7;
        delta = 7 - monday + (target === 0 ? 6 : target - 1);
      }
      day.setDate(day.getDate() + delta);
      take(weekday);
    } else if (week) {
      day = localDay(reference);
      const monday = (day.getDay() + 6) % 7;
      day.setDate(
        day.getDate() + (week[0] === 'dau tuan sau' ? 7 - monday : 6 - monday),
      );
      take(week);
    }

    const time = normalized.match(
      /\b(?:(?:luc|truoc|vao)\s+)?(\d{1,2})\s*(?:h|gio|:)(?:\s*(\d{1,2}))?(?:\s*(?:phut))?(?:\s*(sang|chieu|toi|dem|trua))?\b/,
    );
    if (time) {
      hour = Number(time[1]);
      minute = Number(time[2] || 0);
      const period =
        time[3] || (/(?:chieu|toi|dem)/.test(normalized) ? 'chieu' : '');
      if (period && hour < 12) hour += 12;
      if (hour > 23 || minute > 59) {
        warning = 'Giờ trong câu chưa hợp lệ; bạn hãy chọn lại.';
        hour = 23;
        minute = 59;
      } else if (day) {
        hasTime = true;
        take(time);
      } else warning = 'Có giờ nhưng chưa rõ ngày. Bạn hãy bổ sung thời hạn.';
    }

    if (day) day.setHours(hour, minute, 0, 0);

    const duration = normalized.match(
      /\b(?:khoang|mat|danh|trong)\s+(\d{1,3})\s*(phut|tieng)\b/,
    );
    const minutes =
      duration
        ? Number(duration[1]) * (duration[2] === 'tieng' ? 60 : 1)
        : null;
    if (duration) take(duration);

    let title = chunk;
    for (const s of spans.sort((a, b) => b.start - a.start))
      title = title.slice(0, s.start) + title.slice(s.end);
    title = title
      .replace(/\s+/g, ' ')
      .replace(/\s*(?:trước|lúc|vào|hạn|deadline|đến hạn)\s*$/iu, '')
      .replace(/^[\s,:\-]+|[\s,:\-]+$/g, '')
      .trim();
    if (!title) title = chunk;
    title = title.charAt(0).toLocaleUpperCase('vi-VN') + title.slice(1);

    const urgent = /\b(gap|khan cap|quan trong|uu tien cao)\b/.test(normalized);
    const low = /\b(khong gap|uu tien thap|luc ranh)\b/.test(normalized);
    const priority: Priority = low
      ? 'low'
      : urgent
      ? 'high'
      : day && day.getTime() - reference.getTime() < 86400000
      ? 'high'
      : 'medium';

    return {
      id: uuidv4(),
      title,
      due: day?.toISOString() ?? null,
      hasTime,
      priority,
      minutes: minutes && minutes <= 1440 ? minutes : null,
      selected: true,
      warning,
    };
  });
}

