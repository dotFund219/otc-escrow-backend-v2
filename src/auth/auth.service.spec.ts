import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Repository } from 'typeorm';
import { User } from '../db/entities/user.entity';
import { SiweNonce } from '../db/entities/siwe-nonce.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  let userRepo: Repository<User>;
  let nonceRepo: Repository<SiweNonce>;

  beforeEach(async () => {

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,

        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },

        {
          provide: getRepositoryToken(SiweNonce),
          useValue: {
            save: jest.fn(),
            create: jest.fn(),
            findOne: jest.fn(),
          },
        },

        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    nonceRepo = module.get(getRepositoryToken(SiweNonce));
  });

  it('should generate nonce', async () => {

    nonceRepo.create = jest.fn().mockReturnValue({
      walletAddress: '0x1234567890123456789012345678901234567890',
      nonce: 'abc',
      expiresAt: new Date(),
    });

    nonceRepo.save = jest.fn().mockResolvedValue(true);

    const result = await service.issueNonce('0x1234567890123456789012345678901234567890');

    expect(result.nonce).toBeDefined();
    expect(nonceRepo.save).toHaveBeenCalled();
  });

});
