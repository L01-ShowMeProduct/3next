import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { APP_ENV, AppEnv } from '../config/env';
import { UserEntity } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto, LoginDto, RegisterDto, UserResponseDto } from './dto/auth.dto';
import { RefreshTokenEntity, RevokeReason } from './refresh-token.entity';

const BCRYPT_ROUNDS = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Hash bcrypt của một chuỗi bất kỳ, dùng để so sánh "giả" khi email không tồn tại (chống dò email qua thời gian phản hồi). */
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function toUserResponse(u: UserEntity): UserResponseDto {
  return { id: u.id, email: u.email, displayName: u.displayName, createdAt: u.createdAt.toISOString() };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    @InjectRepository(RefreshTokenEntity) private readonly tokens: Repository<RefreshTokenEntity>,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (await this.users.findByEmail(dto.email)) throw new ConflictException('Email này đã được đăng ký.');
    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let user: UserEntity;
    try {
      user = await this.users.create(dto.email, hash, dto.displayName?.trim() || null);
    } catch (e: unknown) {
      // Hai request đăng ký cùng email chạy song song: unique index chặn được, báo 409 thay vì 500.
      if ((e as { code?: string }).code === '23505') throw new ConflictException('Email này đã được đăng ký.');
      throw e;
    }
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.users.findByEmail(dto.email);
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) throw new UnauthorizedException('Email hoặc mật khẩu không đúng.');
    return this.issueTokens(user);
  }

  /**
   * Đổi refresh token lấy cặp token mới (rotation): token cũ bị thu hồi ngay.
   * Nếu ai đó dùng lại một token đã bị thu hồi, khả năng cao token đã bị lộ,
   * nên thu hồi luôn mọi phiên của user đó, buộc đăng nhập lại.
   */
  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const record = await this.findRefreshToken(refreshToken);
    if (!record) throw new UnauthorizedException('Refresh token không hợp lệ.');

    if (record.revokedAt) {
      // Token đã đổi sang token mới mà còn bị gửi lại: có thể đã lộ, thu hồi mọi phiên.
      if (record.revokedReason === 'rotated') await this.revokeAllForUser(record.userId, 'reuse');
      throw new UnauthorizedException('Refresh token đã bị dùng hoặc đã đăng xuất. Hãy đăng nhập lại.');
    }
    if (record.expiresAt.getTime() <= Date.now()) throw new UnauthorizedException('Refresh token đã hết hạn. Hãy đăng nhập lại.');

    // Thu hồi có điều kiện để hai request refresh song song không cùng thành công.
    const res = await this.tokens.update(
      { id: record.id, revokedAt: IsNull() },
      { revokedAt: new Date(), revokedReason: 'rotated' },
    );
    if (!res.affected) throw new UnauthorizedException('Refresh token đã bị dùng. Hãy đăng nhập lại.');

    const user = await this.users.findById(record.userId);
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại.');
    return this.issueTokens(user);
  }

  /** Đăng xuất một thiết bị: thu hồi refresh token đó. Gọi lại nhiều lần vẫn an toàn. */
  async logout(refreshToken: string): Promise<void> {
    const record = await this.findRefreshToken(refreshToken);
    if (record && !record.revokedAt) {
      await this.tokens.update({ id: record.id, revokedAt: IsNull() }, { revokedAt: new Date(), revokedReason: 'logout' });
    }
  }

  /** Đăng xuất khỏi mọi thiết bị. */
  async revokeAllForUser(userId: string, reason: RevokeReason = 'logout_all'): Promise<void> {
    await this.tokens.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date(), revokedReason: reason });
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại.');
    return toUserResponse(user);
  }

  private async issueTokens(user: UserEntity): Promise<AuthResponseDto> {
    const expiresIn = this.env.accessTokenTtlSeconds;
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, typ: 'access' }, { expiresIn });

    const secret = randomBytes(32).toString('base64url');
    const record = await this.tokens.save(
      this.tokens.create({
        userId: user.id,
        tokenHash: sha256(secret),
        expiresAt: new Date(Date.now() + this.env.refreshTokenTtlDays * DAY_MS),
        revokedAt: null,
        revokedReason: null,
      }),
    );
    // Token gửi cho client có dạng "<id>.<bí mật>": id để tìm nhanh, bí mật chỉ lưu dạng hash.
    return { accessToken, expiresIn, refreshToken: `${record.id}.${secret}`, user: toUserResponse(user) };
  }

  private async findRefreshToken(token: string): Promise<RefreshTokenEntity | null> {
    const [id, secret] = token.split('.');
    if (!id || !secret || !UUID_RE.test(id)) return null;
    const record = await this.tokens.findOneBy({ id });
    if (!record) return null;
    const a = Buffer.from(record.tokenHash, 'hex');
    const b = Buffer.from(sha256(secret), 'hex');
    return a.length === b.length && timingSafeEqual(a, b) ? record : null;
  }
}
