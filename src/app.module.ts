import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from './auth/auth.module';
import { User } from './db/entities/user.entity';
import { SiweNonce } from './db/entities/siwe-nonce.entity';

@Module({
  imports: [
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
        entities: [User, SiweNonce],
        synchronize: true,
        charset: 'utf8mb4',
      }),
    }),

    AuthModule,
  ],
})
export class AppModule {}
