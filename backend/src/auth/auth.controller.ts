import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public } from './auth.decorators';
import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto, RefreshDto, RegisterDto, UserResponseDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản', description: 'Đăng ký xong là đăng nhập luôn, trả về cặp token.' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Email sai định dạng hoặc mật khẩu quá ngắn' })
  @ApiConflictResponse({ description: 'Email đã được đăng ký' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập', description: 'Mỗi lần đăng nhập (mỗi thiết bị) có một refresh token riêng.' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email hoặc mật khẩu không đúng' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lấy access token mới',
    description: 'Gửi refresh token, nhận cặp token mới. Refresh token cũ hết hiệu lực ngay, client phải lưu token mới.',
  })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token sai, hết hạn hoặc đã dùng' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Đăng xuất thiết bị này', description: 'Thu hồi refresh token đã gửi.' })
  @ApiNoContentResponse({ description: 'Đã đăng xuất' })
  async logout(@Body() dto: RefreshDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất mọi thiết bị' })
  @ApiNoContentResponse({ description: 'Đã thu hồi mọi refresh token' })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.auth.revokeAllForUser(user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin tài khoản đang đăng nhập' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Chưa đăng nhập' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
