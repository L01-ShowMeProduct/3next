import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdateStatusDto {
  @ApiProperty({ enum: ['open', 'done'], example: 'done', description: 'Trạng thái mới của task' })
  @IsEnum(['open', 'done'])
  status: 'open' | 'done';
}

