import { Controller, Get, Redirect, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from './auth/auth.decorators';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  /** Widget Android dựa vào giá trị này để nhận biết API 3Next, đừng đổi. */
  @ApiProperty({ example: '3next-backend' })
  service!: string;

  @ApiProperty({ example: 'ok', description: 'Trạng thái kết nối PostgreSQL' })
  database!: string;

  @ApiProperty({ example: '2026-11-03T07:00:00.000Z' })
  time!: string;
}

@Public()
@Controller()
export class AppController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Mở trang gốc sẽ chuyển thẳng sang Swagger Docs. */
  @Get()
  @Redirect('/docs', 302)
  @ApiExcludeEndpoint()
  root(): void {}

  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Kiểm tra server và database còn sống' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Không kết nối được database' })
  async health(): Promise<HealthResponseDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', service: '3next-backend', database: 'down' });
    }
    return { status: 'ok', service: '3next-backend', database: 'ok', time: new Date().toISOString() };
  }
}
