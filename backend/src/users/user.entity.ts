import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'users' })
@Index('UQ_users_email', ['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_users' })
  id!: string;

  /** Luôn lưu dạng chữ thường, đã bỏ khoảng trắng. Có unique index. */
  @Column({ type: 'varchar', length: 254 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 80, nullable: true })
  displayName!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
