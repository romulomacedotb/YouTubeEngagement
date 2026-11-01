import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let authService: { getAccountFromSession: jest.Mock };

  beforeEach(async () => {
    authService = {
      getAccountFromSession: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
            $executeRawUnsafe: jest.fn().mockResolvedValue(0),
          },
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check status ok', async () => {
    const result = await controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.version).toBe('1.0.0');
  });

  it('should block unauthenticated backup download in production', async () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(
        controller.downloadDatabaseBackup(
          undefined,
          { cookies: {}, headers: {} } as any,
          {} as any,
        ),
      ).rejects.toThrow(UnauthorizedException);
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
