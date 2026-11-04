import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { CapturesService } from './captures.service';
import { CaptureResponseDto, ConfirmCaptureResponseDto } from './dto/capture-response.dto';
import { ConfirmCaptureDto } from './dto/confirm-capture.dto';
import { CreateCaptureDto } from './dto/create-capture.dto';
import { ListCapturesQueryDto } from './dto/list-captures-query.dto';

@ApiTags('Captures')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc access token hết hạn' })
@Controller('captures')
export class CapturesController {
  constructor(private readonly capturesService: CapturesService) {}

  @Post()
  @ApiOperation({
    summary: 'Gửi một câu để AI tách thành các task',
    description:
      'Nhận câu nói hoặc gõ tự nhiên, tách thành các task nháp kèm deadline và mức ưu tiên. ' +
      'Chưa lưu thành task thật: cần gọi POST /captures/{id}/confirm sau khi người dùng xem và sửa.',
  })
  @ApiCreatedResponse({ type: CaptureResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiUnprocessableEntityResponse({ description: 'Không tách được việc nào từ nội dung' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCaptureDto) {
    return this.capturesService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách capture', description: 'Có thể lọc theo trạng thái. Mới nhất trước.' })
  @ApiOkResponse({ type: CaptureResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListCapturesQueryDto) {
    return this.capturesService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một capture' })
  @ApiParam({ name: 'id', description: 'Id của capture (UUID)' })
  @ApiOkResponse({ type: CaptureResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy capture' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.capturesService.findOne(user.id, id);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Xác nhận capture và lưu thành task',
    description:
      'Gửi body rỗng để lưu đúng các task AI đã tách, hoặc gửi danh sách "tasks" đã sửa hoặc xóa bớt. ' +
      'Chỉ xác nhận được capture đang ở trạng thái pending.',
  })
  @ApiParam({ name: 'id', description: 'Id của capture (UUID)' })
  @ApiOkResponse({ type: ConfirmCaptureResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy capture' })
  @ApiConflictResponse({ description: 'Capture đã được xác nhận hoặc đã bỏ qua' })
  confirm(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ConfirmCaptureDto) {
    return this.capturesService.confirm(user.id, id, dto.tasks);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Bỏ qua capture',
    description: 'Đánh dấu discarded, không tạo task. Chỉ bỏ qua được capture đang pending.',
  })
  @ApiParam({ name: 'id', description: 'Id của capture (UUID)' })
  @ApiOkResponse({ type: CaptureResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy capture' })
  @ApiConflictResponse({ description: 'Capture đã được xác nhận hoặc đã bỏ qua' })
  discard(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.capturesService.discard(user.id, id);
  }
}
