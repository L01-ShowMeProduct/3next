import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_ENV, AppEnv } from '../config/env';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RefreshTokenEntity } from './refresh-token.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshTokenEntity]),
    JwtModule.registerAsync({
      inject: [APP_ENV],
      useFactory: (env: AppEnv) => ({ secret: env.jwtSecret, signOptions: { algorithm: 'HS256' }, verifyOptions: { algorithms: ['HS256'] } }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Guard toàn cục: mặc định mọi endpoint cần đăng nhập, endpoint công khai gắn @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
