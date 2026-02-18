import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../src/db/entities/user.entity';
import { SiweNonce } from '../src/db/entities/siwe-nonce.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

describe('AuthController (e2e)', () => {

  let app: INestApplication;

  beforeAll(async () => {

    const moduleFixture: TestingModule =
      await Test.createTestingModule({

        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            // optional: ignoreEnvFile: true,
            // optional: load: [() => ({ JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: 3600 })],
          }),
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            entities: [User, SiweNonce],
            synchronize: true,
          }),

          AuthModule,
        ],

      }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  it('/auth/siwe/nonce (GET)', async () => {

    const res = await request(app.getHttpServer())
      .get('/auth/siwe/nonce')
      .query({ address: '0x1234567890123456789012345678901234567890' })
      .expect(200);

    expect(res.body.nonce).toBeDefined();

  });

});
