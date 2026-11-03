import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CaptureStatus } from '../capture.types';

export class ListCapturesQueryDto {
  @ApiPropertyOptional({ enum: CaptureStatus, description: 'Lọc theo trạng thái' })
  @IsOptional()
  @IsEnum(CaptureStatus)
  status?: CaptureStatus;
}
