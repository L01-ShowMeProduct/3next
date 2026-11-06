import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsEnum } from 'class-validator';

export class CreateCaptureDto {
  @ApiProperty({
    example: 'Ngày mai 9h họp nhóm, cuối tuần nộp bài assignment, mua tài liệu trong 3 ngày',
    description: 'Văn bản cần tách công việc (tối đa 12.000 ký tự)',
  })
  @IsString() @IsNotEmpty() @MaxLength(12000)
  text: string;

  @ApiProperty({ enum: ['text', 'voice'], example: 'text', description: 'Nguồn nhập liệu' })
  @IsEnum(['text', 'voice'])
  mode: 'text' | 'voice';
}

