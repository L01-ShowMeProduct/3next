import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateTaskDto } from '../../tasks/dto/create-task.dto';

export class ConfirmCaptureDto {
  @ApiPropertyOptional({
    type: CreateTaskDto,
    isArray: true,
    description:
      'Danh sách task sau khi người dùng đã sửa hoặc xóa bớt. Bỏ trống để lưu đúng các task AI đã tách.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreateTaskDto)
  tasks?: CreateTaskDto[];
}
