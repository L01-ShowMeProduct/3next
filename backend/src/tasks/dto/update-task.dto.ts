import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsISO8601,
  IsBoolean, IsEnum, IsInt, Min, Max,
} from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Nộp báo cáo nhóm (đã sửa)' })
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(1000)
  title?: string;

  @ApiPropertyOptional({ example: '2026-11-12T09:00:00.000Z' })
  @IsOptional() @IsISO8601()
  due?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean()
  hasTime?: boolean;

  @ApiPropertyOptional({ enum: ['high', 'medium', 'low'] })
  @IsOptional() @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ example: 90 })
  @IsOptional() @IsInt() @Min(1) @Max(1440)
  minutes?: number | null;
}

