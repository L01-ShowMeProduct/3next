import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { TaskPriority, TaskStatus } from '../task.types';

export class ListTasksQueryDto {
  @ApiPropertyOptional({ enum: TaskStatus, description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, description: 'Lọc theo mức ưu tiên' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}
