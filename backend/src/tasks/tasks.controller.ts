import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';

@ApiTags('Tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ── GET /tasks ─────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách task', description: 'Hỗ trợ lọc theo status, priority và sắp xếp thông minh.' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'done'], description: 'Lọc theo trạng thái' })
  @ApiQuery({ name: 'priority', required: false, enum: ['high', 'medium', 'low'], description: 'Lọc theo độ ưu tiên' })
  @ApiQuery({ name: 'ranked', required: false, type: Boolean, description: 'true → sắp xếp thông minh (chỉ open)' })
  @ApiResponse({ status: 200, description: 'Thành công', schema: { example: { tasks: [], total: 0 } } })
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('ranked') ranked?: string,
  ) {
    return this.tasksService.findAll(status, priority, ranked === 'true');
  }

  // ── PATCH /tasks/reorder  (phải đứng TRƯỚC /:id) ──────────────────────────
  @Patch('reorder')
  @ApiOperation({ summary: 'Đổi thứ tự thủ công', description: 'Gán manualOrder cho nhiều task cùng lúc.' })
  @ApiResponse({ status: 200, schema: { example: { updated: 2 } } })
  reorder(@Body() dto: ReorderTasksDto) {
    return this.tasksService.reorder(dto);
  }

  // ── POST /tasks ────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Tạo task mới' })
  @ApiResponse({ status: 201, description: 'Task đã được tạo.' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  // ── GET /tasks/:id ─────────────────────────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một task' })
  @ApiParam({ name: 'id', description: 'UUID của task' })
  @ApiResponse({ status: 200, description: 'Thành công.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  // ── PATCH /tasks/:id ───────────────────────────────────────────────────────
  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nội dung task (partial)' })
  @ApiParam({ name: 'id', description: 'UUID của task' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  // ── PATCH /tasks/:id/status ────────────────────────────────────────────────
  @Patch(':id/status')
  @ApiOperation({ summary: 'Đánh dấu done / open', description: 'Cập nhật trạng thái và completedAt tự động.' })
  @ApiParam({ name: 'id', description: 'UUID của task' })
  @ApiResponse({ status: 200, description: 'Đã cập nhật trạng thái.' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.tasksService.updateStatus(id, dto.status);
  }

  // ── DELETE /tasks/:id ──────────────────────────────────────────────────────
  @Delete(':id')
  @ApiOperation({ summary: 'Xoá task' })
  @ApiParam({ name: 'id', description: 'UUID của task' })
  @ApiResponse({ status: 200, schema: { example: { message: 'Task đã được xoá.' } } })
  @ApiResponse({ status: 404, description: 'Không tìm thấy.' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}

