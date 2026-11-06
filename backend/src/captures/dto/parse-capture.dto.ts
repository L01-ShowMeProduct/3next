import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ParseCaptureDto {
  @ApiProperty({
    enum: ['local', 'gemini'],
    example: 'local',
    description: '`local` – tách offline, `gemini` – gọi Gemini API',
  })
  @IsEnum(['local', 'gemini'])
  engine: 'local' | 'gemini';

  @ApiPropertyOptional({
    example: 'model-supported-by-your-project',
    description: 'Model được Google hỗ trợ cho dự án của bạn; có thể bỏ nếu server đã cấu hình GEMINI_MODEL',
  })
  @IsOptional() @IsString()
  model?: string;

  @ApiPropertyOptional({
    example: 'AIzaSy...',
    description: 'Gemini API key (bắt buộc khi engine=gemini)',
  })
  @IsOptional() @IsString()
  apiKey?: string;
}

