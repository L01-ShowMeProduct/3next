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
    example: 'gemini-2.0-flash-lite',
    description: 'Tên model Gemini (bắt buộc khi engine=gemini)',
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

