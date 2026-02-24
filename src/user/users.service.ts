import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../db/entities/user.entity';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(KycUploadEntity)
    private readonly kycRepo: Repository<KycUploadEntity>,
  ) {}

  async findByAddressOrThrow(address: string) {
    const addr = address.trim().toLowerCase();

    const user = await this.usersRepo.findOne({
      where: { walletAddress: addr },
    });

    if (!user) {
      throw new NotFoundException(`User not found for address: ${addr}`);
    }

    const latestKyc = await this.kycRepo.findOne({
      where: { user: { id: user.id } } as any,
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        status: true,
        relativePath: true,
        createdAt: true,
        originalName: true,
      } as any,
    });

    return {
      ...user,
      kyc: latestKyc
        ? {
            id: latestKyc.id,
            status: latestKyc.status,
            url: `/uploads/${latestKyc.relativePath}`,
            createdAt: latestKyc.createdAt,
            originalName: latestKyc.originalName,
          }
        : null,
    };
  }

  async getAllUsers() {
    const users = await this.usersRepo.find({
      order: { createdAt: 'DESC' },
    });
    return users;
  }

  /**
   * Return all users along with their latest KYC upload (if any).
   * Useful for admin user listing screens.
   */
  async getAllUsersWithKyc() {
    const users = await this.usersRepo.find({
      order: { createdAt: 'DESC' },
    });

    const results: Array<any> = [];

    for (const user of users) {
      const latestKyc = await this.kycRepo.findOne({
        where: { user: { id: user.id } } as any,
        order: { createdAt: 'DESC' },
        select: {
          id: true,
          status: true,
          relativePath: true,
          createdAt: true,
          originalName: true,
        } as any,
      });

      results.push({
        ...user,
        kyc: latestKyc
          ? {
              id: latestKyc.id,
              status: latestKyc.status,
              url: `/uploads/${latestKyc.relativePath}`,
              createdAt: latestKyc.createdAt,
              originalName: latestKyc.originalName,
            }
          : null,
      });
    }

    return results;
  }
}
