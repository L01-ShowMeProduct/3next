import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskPriority } from '../task.types';

export class CreateTaskDto {
  @ApiProperty({ example: 'Nộp báo cáo môn Mobile', minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: '2026-11-20T16:59:00.000Z',
    description: 'Hạn chót, định dạng ISO 8601. Bỏ trống nếu không có hạn.',
    nullable: true,
  })
  @IsOptional()
  @IsISO8601()
  deadline?: string | null;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
