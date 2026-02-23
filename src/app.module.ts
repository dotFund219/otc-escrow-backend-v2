import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
import { KycModule } from './kyc/kyc.module';
import { KycUploadEntity } from './db/entities/kyc-upload.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

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
          KycUploadEntity,
        ],
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),
    OtcOrdersIndexerModule,
    AuthModule,
    OrdersModule,
    UsersModule,
    KycModule,
  ],
})
export class AppModule {}
