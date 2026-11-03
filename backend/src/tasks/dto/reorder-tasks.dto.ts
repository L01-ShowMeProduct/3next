import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItem {
  @ApiProperty({ example: 'uuid-task-1' })
  @IsString()
  id: string;

  @ApiProperty({ example: 0, description: 'Vị trí mới (0 = đầu tiên)' })
  @IsInt() @Min(0)
  manualOrder: number;
}

export class ReorderTasksDto {
  @ApiProperty({
    type: [OrderItem],
    description: 'Danh sách id và vị trí mới',
    example: [{ id: 'uuid-1', manualOrder: 0 }, { id: 'uuid-2', manualOrder: 1 }],
  })
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => OrderItem)
  orders: OrderItem[];
}

