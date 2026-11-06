import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class HealthController {
  // /health is reserved for the legacy API detection used by Android widgets.
  @Get('healthz')
  @ApiOperation({ summary: 'Kiểm tra backend sẵn sàng nhận request' })
  health() {
    return { status: 'ok', service: '3next-api', timeSemantics: 'utc' };
  }
}
