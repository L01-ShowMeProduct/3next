import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class TopTasksQueryDto {
  @ApiPropertyOptional({ default: 3, minimum: 1, maximum: 10, description: 'Số việc cần lấy' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 3;
}
