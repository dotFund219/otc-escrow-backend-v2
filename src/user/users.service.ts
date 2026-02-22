import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../db/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByAddressOrThrow(address: string) {
    const addr = address.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: { walletAddress: addr },
    });

    if (!user) {
      throw new NotFoundException(`User not found for address: ${addr}`);
    }

    return user;
  }
}
