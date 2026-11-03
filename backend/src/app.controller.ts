import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '3next-backend' })
  service!: string;

  @ApiProperty({ example: '2026-11-03T07:00:00.000Z' })
  time!: string;
}

@Controller()
export class AppController {
  /** Mở trang gốc sẽ chuyển thẳng sang Swagger Docs. */
  @Get()
  @Redirect('/docs', 302)
  @ApiExcludeEndpoint()
  root(): void {}

  @Get('health')
  @ApiTags('Health')
  @ApiOperation({ summary: 'Kiểm tra server còn sống' })
  @ApiOkResponse({ type: HealthResponseDto })
  health(): HealthResponseDto {
    return { status: 'ok', service: '3next-backend', time: new Date().toISOString() };
  }
}
