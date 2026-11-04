import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Bỏ khoảng trắng thừa và đưa về chữ thường trước khi kiểm tra (bàn phím điện thoại hay tự thêm dấu cách). */
const NormalizeEmail = () => Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

export class RegisterDto {
  @ApiProperty({ example: 'khoa@hcmut.edu.vn', maxLength: 254 })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'matkhau123', minLength: 8, maxLength: 72, description: 'Ít nhất 8 ký tự' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  // bcrypt chỉ dùng 72 byte đầu, dài hơn thì phần sau bị bỏ qua mà người dùng không biết.
  @MaxLength(72, { message: 'Mật khẩu tối đa 72 ký tự' })
  password!: string;

  @ApiPropertyOptional({ example: 'Khoa', maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'khoa@hcmut.edu.vn' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'matkhau123' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token nhận được khi đăng nhập hoặc lần refresh trước' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  refreshToken!: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '7c0f4f6e-2a43-4b9e-9d0a-5f1c2e3b4a5d' })
  id!: string;

  @ApiProperty({ example: 'khoa@hcmut.edu.vn' })
  email!: string;

  @ApiProperty({ example: 'Khoa', nullable: true, type: String })
  displayName!: string | null;

  @ApiProperty()
  createdAt!: string;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Gửi trong header Authorization: Bearer <accessToken>' })
  accessToken!: string;

  @ApiProperty({ example: 900, description: 'Số giây access token còn hiệu lực' })
  expiresIn!: number;

  @ApiProperty({ description: 'Dùng để lấy access token mới (POST /auth/refresh). Mỗi lần dùng sẽ đổi sang token mới.' })
  refreshToken!: string;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
