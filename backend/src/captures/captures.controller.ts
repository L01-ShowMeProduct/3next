import {
  Controller, Get, Post, Delete,
  Param, Body,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { CapturesService } from './captures.service';
import { CreateCaptureDto } from './dto/create-capture.dto';
import { ParseCaptureDto } from './dto/parse-capture.dto';
import { ConfirmCaptureDto } from './dto/confirm-capture.dto';

@ApiTags('Captures')
@Controller('captures')
export class CapturesController {
  constructor(private readonly capturesService: CapturesService) {}

  // ── GET /captures ──────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả captures (không kèm drafts)' })
  @ApiResponse({ status: 200, schema: { example: { captures: [], total: 0 } } })
  findAll() {
    return this.capturesService.findAll();
  }

  // ── POST /captures ─────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Tạo capture mới',
    description: 'Ghi nhận văn bản. Trạng thái ban đầu là `draft`.',
  })
  @ApiResponse({
    status: 201,
    description: 'Capture đã được tạo.',
    schema: {
      example: {
        id: 'uuid',
        text: 'Ngày mai 9h họp nhóm',
        capturedAt: '2026-11-03T07:25:00.000Z',
        mode: 'text',
        status: 'draft',
        drafts: [],
      },
    },
  })
  create(@Body() dto: CreateCaptureDto) {
    return this.capturesService.create(dto);
  }

  // ── GET /captures/:id ──────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một capture (kèm drafts nếu đã parse)' })
  @ApiParam({ name: 'id', description: 'UUID của capture' })
  @ApiResponse({ status: 200, description: 'Thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  findOne(@Param('id') id: string) {
    return this.capturesService.findOne(id);
  }

  // ── POST /captures/:id/parse ───────────────────────────────────────────────
  @Post(':id/parse')
  @ApiOperation({
    summary: 'Tách task từ capture',
    description:
      '- `engine=local` → phân tích offline (không cần API key)\n' +
      '- `engine=gemini` → gọi Gemini API (cần `apiKey`; model từ request hoặc GEMINI_MODEL của server)\n\n' +
      'Trả về capture với `status=review` và danh sách `drafts`.',
  })
  @ApiParam({ name: 'id', description: 'UUID của capture' })
  @ApiResponse({ status: 201, description: 'Đã tách xong, trả về drafts.' })
  @ApiResponse({ status: 400, description: 'Lỗi tham số hoặc Gemini.' })
  @ApiResponse({ status: 409, description: 'Capture đang được tách.' })
  @ApiResponse({ status: 504, description: 'Gemini vượt thời gian chờ; có thể thử lại.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  parse(@Param('id') id: string, @Body() dto: ParseCaptureDto) {
    return this.capturesService.parse(id, dto);
  }

  // ── POST /captures/:id/confirm ─────────────────────────────────────────────
  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Xác nhận drafts → tạo Task',
    description:
      'Truyền `selectedIds` chứa id các draft muốn lưu. ' +
      'Capture sẽ bị xoá sau khi xác nhận.',
  })
  @ApiParam({ name: 'id', description: 'UUID của capture' })
  @ApiResponse({
    status: 201,
    description: 'Các task đã được tạo.',
    schema: { example: { created: 2, tasks: [] } },
  })
  @ApiResponse({ status: 400, description: 'Capture chưa ở trạng thái review hoặc selectedIds không thuộc drafts hiện tại.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  confirm(@Param('id') id: string, @Body() dto: ConfirmCaptureDto) {
    return this.capturesService.confirm(id, dto);
  }

  // ── DELETE /captures/:id ───────────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Huỷ capture (xoá không tạo task)' })
  @ApiParam({ name: 'id', description: 'UUID của capture' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Capture đã bị huỷ.' } } })
  @ApiResponse({ status: 409, description: 'Capture đang được tách; chưa thể huỷ.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  discard(@Param('id') id: string) {
    return this.capturesService.discard(id);
  }
}

