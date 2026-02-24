import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../db/entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';
import { OtcOrdersIndexerModule } from '../indexer/otc-orders-indexer.module';
import { AdminGuard } from '../auth/admin.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KycUploadEntity]),
    OtcOrdersIndexerModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AdminGuard],
})
export class UsersModule {}
