import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SyncStateEntity } from '../db/entities/sync-state.entity';
import { OtcOrderEntity } from '../db/entities/otc-order.entity';
import { OtcOrderEventEntity } from '../db/entities/otc-order-event.entity';

import { OtcOrdersIndexerService } from './otc-orders-indexer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SyncStateEntity,
      OtcOrderEntity,
      OtcOrderEventEntity,
    ]),
  ],
  providers: [OtcOrdersIndexerService],
  exports: [OtcOrdersIndexerService],
})
export class OtcOrdersIndexerModule {}
