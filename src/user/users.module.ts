import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../db/entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, KycUploadEntity])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
