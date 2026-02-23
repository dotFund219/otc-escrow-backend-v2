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

  // 프로젝트마다 인증/유저 식별 방식이 다르니
  // 여기서는 "address"로 유저를 찾는 형태를 기본 제공.
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
