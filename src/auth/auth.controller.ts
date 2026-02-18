import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/siwe')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 1) issue nonce for a given wallet address
  @Get('nonce')
  async issueNonce(@Query('address') address: string) {
    return this.authService.issueNonce(address);
  }

  // 2) verify the SIWE message and signature, then return JWT if valid
  @Post('verify')
  async verify(@Body() body: { message: string; signature: string }) {
    return this.authService.verifySiwe(body.message, body.signature);
  }
}
