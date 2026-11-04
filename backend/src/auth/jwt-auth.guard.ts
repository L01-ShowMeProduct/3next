import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, IS_PUBLIC_KEY } from './auth.decorators';

interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

/**
 * Guard toàn cục: mọi request phải có header `Authorization: Bearer <access token>`,
 * trừ endpoint gắn @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const [scheme, token] = header?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Cần đăng nhập. Gửi header Authorization: Bearer <accessToken>.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Access token không hợp lệ hoặc đã hết hạn. Gọi POST /auth/refresh để lấy token mới.');
    }
    if (payload.typ !== 'access' || !payload.sub) throw new UnauthorizedException('Token không phải access token.');

    req.user = { id: payload.sub, email: payload.email } satisfies AuthUser;
    return true;
  }
}
