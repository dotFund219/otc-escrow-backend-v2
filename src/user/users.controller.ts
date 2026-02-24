import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { GetUserByAddressParamDto } from '../db/dto/get-user-by-address.param.dto';
import { AdminGuard } from '../auth/admin.guard';

type AuthedRequest = Request & { user?: any };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('by-address/:address')
  async getByAddress(@Param() params: GetUserByAddressParamDto) {
    const user = await this.usersService.findByAddressOrThrow(params.address);

    return {
      id: user.id,
      address: user.walletAddress,
      role: user.role,
      kycTier: user.kycTier,
      createdAt: user.createdAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const address = String(req.user?.address ?? '').toLowerCase();
    const user = await this.usersService.findByAddressOrThrow(address);

    return {
      id: user.id,
      address: user.walletAddress,
      role: user.role,
      kycTier: user.kycTier,
      createdAt: user.createdAt,
      kyc: user.kyc,
    };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('all')
  async all() {
    // admin-only list including latest KYC uploads
    const users = await this.usersService.getAllUsersWithKyc();
    return {
      ok: true,
      users: users.map((u) => ({
        id: u.id,
        address: u.walletAddress,
        role: u.role,
        kycTier: u.kycTier,
        createdAt: u.createdAt,
        kyc: u.kyc,
      })),
    };
  }
}
