import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOneBy({ email: normalizeEmail(email) });
  }

  create(email: string, passwordHash: string, displayName: string | null): Promise<UserEntity> {
    return this.users.save(this.users.create({ email: normalizeEmail(email), passwordHash, displayName }));
  }
}
