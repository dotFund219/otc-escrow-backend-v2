import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { User } from './db/entities/user.entity';
import { SiweNonce } from './db/entities/siwe-nonce.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { OtcOrdersIndexerModule } from './indexer/otc-orders-indexer.module';
import { SyncStateEntity } from './db/entities/sync-state.entity';
import { OtcOrderEntity } from './db/entities/otc-order.entity';
import { OtcOrderEventEntity } from './db/entities/otc-order-event.entity';
import { OrdersModule } from './orders/otc-orders.module';
import { UsersModule } from './user/users.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'mysql',
        host: cfg.get<string>('DB_HOST', 'localhost'),
        port: Number(cfg.get<string>('DB_PORT', '3306')),
        username: cfg.get<string>('DB_USER', 'root'),
        password: cfg.get<string>('DB_PASSWORD', 'password'),
        database: cfg.get<string>('DB_NAME', 'otc_escrow'),
        entities: [
          User,
          SiweNonce,
          SyncStateEntity,
          OtcOrderEntity,
          OtcOrderEventEntity,
        ],
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),
    OtcOrdersIndexerModule,
    AuthModule,
    OrdersModule,
    UsersModule,
  ],
})
export class AppModule {}
