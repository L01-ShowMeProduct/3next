import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { RankedTaskResponseDto, TaskResponseDto } from './dto/task-response.dto';
import { TopTasksQueryDto } from './dto/top-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Chưa đăng nhập hoặc access token hết hạn' })
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo task mới', description: 'Tạo task trực tiếp, không qua capture.' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách task', description: 'Có thể lọc theo trạng thái và mức ưu tiên. Task mới nhất trước.' })
  @ApiOkResponse({ type: TaskResponseDto, isArray: true })
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListTasksQueryDto) {
    return this.tasksService.findAll(user.id, query);
  }

  @Get('top')
  @ApiOperation({
    summary: 'Các việc nên làm tiếp theo (Top 3)',
    description:
      'Chỉ tính task chưa xong của user đang đăng nhập. Xếp theo điểm = độ gấp của deadline + trọng số ưu tiên. Mỗi việc kèm lý do xếp hạng.',
  })
  @ApiOkResponse({ type: RankedTaskResponseDto, isArray: true })
  top(@CurrentUser() user: AuthUser, @Query() query: TopTasksQueryDto) {
    return this.tasksService.top(user.id, query.limit ?? 3);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một task' })
  @ApiParam({ name: 'id', description: 'Id của task (UUID)' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy task' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Sửa task',
    description: 'Chỉ cần gửi các trường muốn đổi. Gửi deadline = null để xóa deadline.',
  })
  @ApiParam({ name: 'id', description: 'Id của task (UUID)' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy task' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(user.id, id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu hoàn thành', description: 'Task đã xong sẽ không còn trong Top 3.' })
  @ApiParam({ name: 'id', description: 'Id của task (UUID)' })
  @ApiOkResponse({ type: TaskResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy task' })
  complete(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.complete(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xóa task' })
  @ApiParam({ name: 'id', description: 'Id của task (UUID)' })
  @ApiNoContentResponse({ description: 'Đã xóa' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy task' })
  async remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    await this.tasksService.remove(user.id, id);
  }
}
