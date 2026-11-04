import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from '../users/user.entity';

export type RevokeReason = 'rotated' | 'logout' | 'logout_all' | 'reuse';

/**
 * Mỗi lần đăng nhập (mỗi thiết bị) có một refresh token.
 * Chỉ lưu SHA-256 của phần bí mật, không lưu token gốc: lộ database cũng không dùng lại được token.
 */
@Entity({ name: 'refresh_tokens' })
@Index('IDX_refresh_tokens_user', ['userId'])
@Check('CHK_refresh_tokens_reason', `"revoked_reason" IN ('rotated', 'logout', 'logout_all', 'reuse')`)
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_refresh_tokens' })
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_refresh_tokens_user' })
  user?: UserEntity;

  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /** Khác null khi token đã bị thu hồi (đăng xuất, hoặc đã đổi sang token mới). */
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  /**
   * Lý do thu hồi. Chỉ khi một token đã "rotated" bị gửi lại mới coi là bị lộ
   * (đăng xuất xong app lỡ gửi lại token thì không đá văng các thiết bị khác).
   */
  @Column({ name: 'revoked_reason', type: 'varchar', length: 16, nullable: true })
  revokedReason!: RevokeReason | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
