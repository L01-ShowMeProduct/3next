import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CaptureSource } from '../capture.types';

export class CreateCaptureDto {
  @ApiProperty({
    example: 'Thứ 6 nộp báo cáo môn Mobile, mai họp nhóm lúc 9 giờ, mua sách ở Fahasa',
    description: 'Một câu tự nhiên, có thể chứa nhiều việc. Với voice, đây là văn bản đã được speech-to-text.',
    minLength: 2,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(1000)
  text!: string;

  @ApiPropertyOptional({ enum: CaptureSource, default: CaptureSource.TEXT })
  @IsOptional()
  @IsEnum(CaptureSource)
  source?: CaptureSource;
}
