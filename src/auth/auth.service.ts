import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { SiweMessage } from 'siwe';
import { JwtService } from '@nestjs/jwt';
import crypto from 'crypto';

import { User } from '../db/entities/user.entity';
import { SiweNonce } from '../db/entities/siwe-nonce.entity';

function normalizeAddress(addr: string) {
  if (!addr) return '';
  return addr.toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(SiweNonce) private readonly nonceRepo: Repository<SiweNonce>,
    private readonly jwt: JwtService,
  ) {}

  async issueNonce(addressRaw: string) {
    const address = normalizeAddress(addressRaw);
    if (!address || !address.startsWith('0x') || address.length !== 42) {
      throw new BadRequestException('Invalid address');
    }

    const nonce = crypto.randomBytes(16).toString('hex'); // 32 chars
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await this.nonceRepo.save(
      this.nonceRepo.create({ walletAddress: address, nonce, expiresAt, used: false }),
    );

    return { nonce, expiresAt };
  }

  async verifySiwe(message: string, signature: string) {
    if (!message || !signature) throw new BadRequestException('Missing message/signature');

    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch {
      throw new BadRequestException('Invalid SIWE message format');
    }

    // 1) verify the SIWE message and signature
    const result = await siwe.verify({ signature }).catch(() => null);
    if (!result?.success) throw new UnauthorizedException('SIWE signature verification failed');

    const address = normalizeAddress(result.data.address);
    const nonce = result.data.nonce;

    // 2) verify nonce exists, not expired, and not used
    const row = await this.nonceRepo.findOne({
      where: {
        walletAddress: address,
        nonce,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { id: 'DESC' },
    });

    if (!row) throw new UnauthorizedException('Nonce not found/expired/used');

    // 3) mark nonce as used
    row.used = true;
    await this.nonceRepo.save(row);

    // 4) User upsert (if new wallet, create with default KYC tier 1)
    let user = await this.userRepo.findOne({ where: { walletAddress: address } });
    if (!user) {
      user = await this.userRepo.save(this.userRepo.create({ walletAddress: address, kycTier: 1 }));
    }

    // 5) issue JWT with user ID and wallet address as payload
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      address: user.walletAddress,
    });

    return {
      user: { id: user.id, walletAddress: user.walletAddress, kycTier: user.kycTier },
      accessToken,
    };
  }
}
