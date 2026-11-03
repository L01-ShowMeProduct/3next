import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../task.types';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Nộp báo cáo môn Mobile (bản cuối)', minLength: 1, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    example: '2026-11-21T16:59:00.000Z',
    description: 'Hạn chót ISO 8601. Gửi null để xóa deadline.',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  deadline?: string | null;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}
