import { ApiProperty } from '@nestjs/swagger';
import { RankedTask, Task, TaskPriority, TaskStatus } from '../task.types';

export class TaskResponseDto implements Task {
  @ApiProperty({ example: '3f2b8c1e-5a7d-4c2e-9b1a-0d6f4e8a7c21' })
  id!: string;

  @ApiProperty({ example: 'Nộp báo cáo môn Mobile' })
  title!: string;

  @ApiProperty({ example: '2026-11-20T16:59:00.000Z', nullable: true, type: String })
  deadline!: string | null;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  priority!: TaskPriority;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.TODO })
  status!: TaskStatus;

  @ApiProperty({ nullable: true, type: String, description: 'Capture đã tạo ra task này' })
  captureId!: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ nullable: true, type: String })
  completedAt!: string | null;
}

export class RankedTaskResponseDto implements RankedTask {
  @ApiProperty({ type: TaskResponseDto })
  task!: TaskResponseDto;

  @ApiProperty({ example: 92.5, description: 'Điểm xếp hạng, càng cao càng nên làm trước' })
  score!: number;

  @ApiProperty({ example: 'Xếp trước vì deadline còn khoảng 5 giờ, mức ưu tiên cao.' })
  reason!: string;
}
