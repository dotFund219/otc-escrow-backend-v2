import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';
import { User } from '../db/entities/user.entity';
import { File } from 'multer';

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycUploadEntity)
    private readonly uploads: Repository<KycUploadEntity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  // Authentication/user identification varies per project
  // here we provide a default that looks up users by "address".
  async resolveUserByAddress(address?: string) {
    if (!address) throw new UnauthorizedException('No user address.');
    const user = await this.users.findOne({
      where: { walletAddress: address.toLowerCase() } as any,
    });
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  async saveUpload(params: { user: User; file: File; relativePath: string }) {
    const { user, file, relativePath } = params;

    const row = this.uploads.create({
      user,
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      relativePath,
      status: 'PENDING',
    });

    const saved = await this.uploads.save(row);

    return {
      id: saved.id,
      url: `/uploads/${saved.relativePath}`,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }
}
