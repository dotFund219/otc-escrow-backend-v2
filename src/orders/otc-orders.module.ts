import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtcOrderEntity } from '../db/entities/otc-order.entity';
import { OrdersController } from './otc-orders.controller';
import { OrdersService } from './otc-orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([OtcOrderEntity])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
