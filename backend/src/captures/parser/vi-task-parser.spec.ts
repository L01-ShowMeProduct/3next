import { TaskPriority } from '../../tasks/task.types';
import { parseVietnameseTasks } from './vi-task-parser';

// Thứ Ba 3/11/2026, 14:00 giờ Việt Nam (07:00 UTC)
const NOW = new Date('2026-11-03T07:00:00.000Z');

/** Chuyển ISO sang chuỗi giờ Việt Nam để dễ đọc trong test. */
const vn = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 16).replace('T', ' ') : null;

describe('parseVietnameseTasks', () => {
  it('tách nhiều việc trong một câu', () => {
    const tasks = parseVietnameseTasks('Thứ 6 nộp báo cáo môn Mobile, mai họp nhóm lúc 9 giờ, mua sách ở Fahasa', NOW);
    expect(tasks.map((t) => t.title)).toEqual(['Nộp báo cáo môn Mobile', 'Họp nhóm', 'Mua sách ở Fahasa']);
  });

  it('hiểu "thứ 6" là thứ Sáu sắp tới, mặc định 23:59', () => {
    const [task] = parseVietnameseTasks('Thứ 6 nộp báo cáo', NOW);
    expect(vn(task.deadline)).toBe('2026-11-06 23:59');
  });

  it('hiểu "mai ... lúc 9 giờ"', () => {
    const [task] = parseVietnameseTasks('mai họp nhóm lúc 9 giờ', NOW);
    expect(vn(task.deadline)).toBe('2026-11-04 09:00');
    expect(task.priority).toBe(TaskPriority.HIGH); // còn dưới 24 giờ
  });

  it('không bịa deadline khi câu không có mốc thời gian', () => {
    const [task] = parseVietnameseTasks('mua sách ở Fahasa', NOW);
    expect(task.deadline).toBeNull();
    expect(task.priority).toBe(TaskPriority.LOW);
  });

  it('hiểu giờ dạng 7h30 và buổi chiều/tối', () => {
    expect(vn(parseVietnameseTasks('ngày mai gặp thầy lúc 7h30', NOW)[0].deadline)).toBe('2026-11-04 07:30');
    expect(vn(parseVietnameseTasks('mai nộp bài lúc 3 giờ chiều', NOW)[0].deadline)).toBe('2026-11-04 15:00');
  });

  it('hiểu ngày dd/mm và tự sang năm sau nếu ngày đã qua', () => {
    expect(vn(parseVietnameseTasks('nộp đồ án ngày 20/11', NOW)[0].deadline)).toBe('2026-11-20 23:59');
    expect(vn(parseVietnameseTasks('nộp học phí 1/3', NOW)[0].deadline)).toBe('2027-03-01 23:59');
  });

  it('hiểu "thứ 2 tuần sau"', () => {
    const [task] = parseVietnameseTasks('thứ 2 tuần sau nộp bài tập', NOW);
    expect(vn(task.deadline)).toBe('2026-11-09 23:59');
  });

  it('hiểu "chủ nhật"', () => {
    const [task] = parseVietnameseTasks('chủ nhật dọn phòng', NOW);
    expect(vn(task.deadline)).toBe('2026-11-08 23:59');
  });

  it('nhận ra từ khóa ưu tiên', () => {
    expect(parseVietnameseTasks('nộp báo cáo gấp', NOW)[0].priority).toBe(TaskPriority.HIGH);
    expect(parseVietnameseTasks('đọc sách khi rảnh', NOW)[0].priority).toBe(TaskPriority.LOW);
    expect(parseVietnameseTasks('đọc sách không gấp', NOW)[0].priority).toBe(TaskPriority.LOW);
  });

  it('bỏ từ đệm ở đầu và cuối tiêu đề', () => {
    const [task] = parseVietnameseTasks('nhớ nộp báo cáo trước thứ 6', NOW);
    expect(task.title).toBe('Nộp báo cáo');
  });

  it('trả về mảng rỗng khi không có nội dung hợp lệ', () => {
    expect(parseVietnameseTasks('   ', NOW)).toEqual([]);
    expect(parseVietnameseTasks('.,;', NOW)).toEqual([]);
  });
});
