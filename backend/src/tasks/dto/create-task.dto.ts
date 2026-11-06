import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsISO8601,
  IsBoolean, IsEnum, IsInt, Min, Max,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Nộp báo cáo nhóm', description: 'Tên công việc (tối đa 1000 ký tự)' })
  @IsString() @IsNotEmpty() @MaxLength(1000)
  title: string;

  @ApiPropertyOptional({ example: '2026-11-10T16:59:00.000Z', description: 'ISO 8601 có Z hoặc offset, hoặc null (23:59 Việt Nam = 16:59Z)' })
  @IsOptional() @IsISO8601()
  due?: string | null;

  @ApiPropertyOptional({ example: false, description: 'true nếu due có giờ cụ thể' })
  @IsOptional() @IsBoolean()
  hasTime?: boolean;

  @ApiPropertyOptional({ enum: ['high', 'medium', 'low'], example: 'high' })
  @IsOptional() @IsEnum(['high', 'medium', 'low'])
  priority?: 'high' | 'medium' | 'low';

  @ApiPropertyOptional({ example: 60, description: 'Thời lượng ước tính (phút, 1-1440) hoặc null' })
  @IsOptional() @IsInt() @Min(1) @Max(1440)
  minutes?: number | null;
}

