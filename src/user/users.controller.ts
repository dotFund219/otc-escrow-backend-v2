import { Controller, Get, UseGuards, Req, Param } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UsersService } from './users.service';
import { GetUserByAddressParamDto } from '../db/dto/get-user-by-address.param.dto';

type AuthedRequest = Request & { user?: any };

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
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
    };
  }
}
