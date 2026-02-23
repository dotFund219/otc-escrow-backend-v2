import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';
import { User } from '../db/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([KycUploadEntity, User])],
  controllers: [KycController],
  providers: [KycService],
})
export class KycModule {}
