import { Test, TestingModule } from '@nestjs/testing';
import { SubscribersService } from './subscribers.service';
import { YouTubeService } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscribersService', () => {
  let service: SubscribersService;
  let prismaService: any;
  let youtubeService: any;
  let authService: any;

  beforeEach(async () => {
    prismaService = {
      channel: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      syncJob: {
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    youtubeService = {
      getMockSubscribers: jest.fn().mockReturnValue([
        {
          youtubeChannelId: 'UC_001',
          title: 'Canal Teste 1',
          subscriberCount: 1000,
          videoCount: 10,
        },
        {
          youtubeChannelId: 'UC_002',
          title: 'Canal Teste 2',
          subscriberCount: 2000,
          videoCount: 20,
        },
      ]),
      fetchSubscribersPage: jest.fn(),
    };

    authService = {
      getAccountFromSession: jest.fn().mockResolvedValue(null),
      getValidAccessToken: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscribersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: YouTubeService, useValue: youtubeService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<SubscribersService>(SubscribersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a sync job and start execution', async () => {
    prismaService.syncJob.create.mockResolvedValue({ id: 'job-123', status: 'PENDING' });
    prismaService.syncJob.update.mockResolvedValue({ id: 'job-123', status: 'RUNNING' });

    const result = await service.startSync();
    expect(result.jobId).toBe('job-123');
    expect(prismaService.syncJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'SUBSCRIBERS',
          status: 'PENDING',
        }),
      }),
    );
  });

  it('should run sync idempotently using upsert without duplicating channels', async () => {
    prismaService.syncJob.update.mockResolvedValue({});
    prismaService.channel.findUnique.mockResolvedValue(null);
    prismaService.channel.upsert.mockResolvedValue({ id: 'ch-1' });
    prismaService.auditLog.create.mockResolvedValue({});

    await service.runSync('job-123');

    // Expected upsert called for each mock subscriber
    expect(prismaService.channel.upsert).toHaveBeenCalledTimes(2);
    expect(prismaService.channel.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { youtubeChannelId: 'UC_001' },
      }),
    );

    // Job should be completed with processedCount = 2
    expect(prismaService.syncJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-123' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          processedCount: 2,
        }),
      }),
    );
  });

  it('should return paginated list of subscribers', async () => {
    const mockChannels = [
      {
        id: '1',
        youtubeChannelId: 'UC_001',
        title: 'Canal Alpha',
        createdAt: new Date(),
        updatedAt: new Date(),
        videos: [],
      },
    ];

    prismaService.channel.findMany.mockResolvedValue(mockChannels);
    prismaService.channel.count.mockResolvedValue(1);

    const result = await service.listSubscribers({ page: 1, pageSize: 10, search: 'Alpha' });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
    expect(result.items[0].title).toBe('Canal Alpha');
  });
});
