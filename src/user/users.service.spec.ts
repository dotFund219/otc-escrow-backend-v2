import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from '../db/entities/user.entity';
import { KycUploadEntity } from '../db/entities/kyc-upload.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: Repository<User>;
  let kycRepo: Repository<KycUploadEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KycUploadEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    kycRepo = module.get(getRepositoryToken(KycUploadEntity));
  });

  it('should return users with latest kyc when available', async () => {
    const users = [
      {
        id: 1,
        walletAddress: '0xabc',
        kycTier: 1,
        role: 'TRADER',
        createdAt: new Date(),
      },
      {
        id: 2,
        walletAddress: '0xdef',
        kycTier: 2,
        role: 'ADMIN',
        createdAt: new Date(),
      },
    ];
    (userRepo.find as jest.Mock).mockResolvedValue(users);

    (kycRepo.findOne as jest.Mock).mockImplementation(({ where }) => {
      if ((where as any).user.id === 1) {
        return Promise.resolve({
          id: 'k1',
          status: 'APPROVED',
          relativePath: 'kyc/abc.png',
          createdAt: new Date('2020-01-01'),
          originalName: 'abc.png',
        });
      }
      return Promise.resolve(null);
    });

    const result = await service.getAllUsersWithKyc();
    expect(result.length).toBe(2);
    expect(result[0].kyc).toEqual({
      id: 'k1',
      status: 'APPROVED',
      url: '/uploads/kyc/abc.png',
      createdAt: new Date('2020-01-01'),
      originalName: 'abc.png',
    });
    expect(result[1].kyc).toBeNull();
  });
});
