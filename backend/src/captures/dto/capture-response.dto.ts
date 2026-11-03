import { ApiProperty } from '@nestjs/swagger';
import { TaskPriority } from '../../tasks/task.types';
import { TaskResponseDto } from '../../tasks/dto/task-response.dto';
import { Capture, CaptureSource, CaptureStatus } from '../capture.types';
import { ParsedTask } from '../parser/vi-task-parser';

export class DraftTaskResponseDto implements ParsedTask {
  @ApiProperty({ example: 'Nộp báo cáo môn Mobile' })
  title!: string;

  @ApiProperty({ example: '2026-11-20T16:59:00.000Z', nullable: true, type: String })
  deadline!: string | null;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  priority!: TaskPriority;
}

export class CaptureResponseDto implements Capture {
  @ApiProperty({ example: '9d1c7a52-8f3e-4b6a-a0c4-2e5b7d9f1a33' })
  id!: string;

  @ApiProperty({ example: 'Thứ 6 nộp báo cáo, mai họp nhóm lúc 9 giờ' })
  rawText!: string;

  @ApiProperty({ enum: CaptureSource })
  source!: CaptureSource;

  @ApiProperty({ enum: CaptureStatus })
  status!: CaptureStatus;

  @ApiProperty({ type: DraftTaskResponseDto, isArray: true, description: 'Các task AI tách ra, chờ xác nhận' })
  drafts!: DraftTaskResponseDto[];

  @ApiProperty({ type: [String], description: 'Id các task đã tạo sau khi xác nhận' })
  taskIds!: string[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ConfirmCaptureResponseDto {
  @ApiProperty({ type: CaptureResponseDto })
  capture!: CaptureResponseDto;

  @ApiProperty({ type: TaskResponseDto, isArray: true })
  tasks!: TaskResponseDto[];
}
