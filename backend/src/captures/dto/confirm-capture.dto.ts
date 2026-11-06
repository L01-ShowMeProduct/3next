import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class ConfirmCaptureDto {
  @ApiProperty({
    type: [String],
    example: ['uuid-draft-1', 'uuid-draft-2'],
    description: 'Danh sách id của các draft muốn lưu thành task. Truyền mảng rỗng [] để huỷ toàn bộ.',
  })
  @IsArray() @IsString({ each: true })
  selectedIds: string[];
}

