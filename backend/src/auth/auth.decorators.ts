import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

/** Thông tin user lấy từ access token, gắn vào request sau khi guard kiểm tra xong. */
export interface AuthUser {
  id: string;
  email: string;
}

export const IS_PUBLIC_KEY = 'isPublic';

/** Đánh dấu endpoint không cần đăng nhập (mặc định mọi endpoint đều cần). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Lấy user hiện tại trong controller: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
