import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminChainService } from '../indexer/admin-chain.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminChain: AdminChainService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as any).user;

    if (!user?.address) {
      throw new UnauthorizedException('Missing auth user');
    }

    const wallet = (user.address as string).toLowerCase() as `0x${string}`;

    const ok = await this.adminChain.isAdmin(wallet);

    if (!ok) {
      throw new ForbiddenException('Admin only');
    }

    return true;
  }
}
