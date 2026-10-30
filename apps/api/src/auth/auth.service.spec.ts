import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let cryptoService: CryptoService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      oAuthAccount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      googleClientConfig: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        CryptoService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  it('should generate an OAuth URL with a secure state', async () => {
    const { url, state } = await authService.generateOAuthUrl();
    expect(url).toContain('accounts.google.com');
    expect(url).toContain(encodeURIComponent(state));
    expect(state).toBeDefined();
    expect(state.length).toBeGreaterThan(16);
  });

  it('should reject callback when state mismatches (CSRF protection)', async () => {
    await expect(
      authService.handleCallback('dummy-code', 'state-from-url', 'state-from-cookie-mismatch'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should validate signed session token and return account info without leaking tokens', async () => {
    const mockAccount = {
      id: 'acc-123',
      googleId: 'g-456',
      channelId: 'UC_TEST',
      channelTitle: 'Test Channel',
      channelThumbnail: 'http://thumb.jpg',
      email: 'test@example.com',
      name: 'Tester',
      encryptedAccessToken: 'encrypted-token-blob',
      encryptedRefreshToken: 'encrypted-refresh-blob',
      createdAt: new Date(),
    };

    prismaService.oAuthAccount.findUnique.mockResolvedValue(mockAccount);

    const sessionToken = authService.createSessionToken('acc-123');
    const result = await authService.getCurrentChannel(sessionToken);

    expect(result.authenticated).toBe(true);
    expect(result.channel?.channelTitle).toBe('Test Channel');
    // Ensure sensitive tokens are NEVER present in public channel response
    expect((result.channel as any).encryptedAccessToken).toBeUndefined();
    expect((result.channel as any).encryptedRefreshToken).toBeUndefined();
  });

  it('should reject invalid or tampered session token', async () => {
    const tamperedToken = 'acc-123.bad-signature';
    const result = await authService.getCurrentChannel(tamperedToken);

    expect(result.authenticated).toBe(false);
    expect(result.channel).toBeUndefined();
  });
});
