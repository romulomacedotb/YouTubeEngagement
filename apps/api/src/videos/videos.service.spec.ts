import { Test, TestingModule } from '@nestjs/testing';
import { VideosService } from './videos.service';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';

describe('VideosService', () => {
  let service: VideosService;
  let prismaService: any;
  let youtubeService: any;
  let authService: any;

  beforeEach(async () => {
    prismaService = {
      channel: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      video: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
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
      getMockLatestVideo: jest.fn().mockReturnValue({
        youtubeVideoId: 'yt_mock_123',
        title: 'Vídeo Teste Recente',
        url: 'https://www.youtube.com/watch?v=yt_mock_123',
        publishedAt: new Date(),
        viewCount: 1500,
      }),
      fetchLatestVideoForChannel: jest.fn(),
    };

    authService = {
      getAccountFromSession: jest.fn().mockResolvedValue(null),
      getValidAccessToken: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideosService,
        { provide: PrismaService, useValue: prismaService },
        { provide: YouTubeService, useValue: youtubeService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get<VideosService>(VideosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return cached video if verified recently without calling YouTube API', async () => {
    const recentDate = new Date();
    const mockChannel = {
      id: 'ch-1',
      title: 'Canal Teste',
      youtubeChannelId: 'UC_001',
      videos: [
        {
          id: 'v-1',
          youtubeVideoId: 'yt-1',
          title: 'Vídeo em Cache',
          checkedAt: recentDate,
        },
      ],
    };

    prismaService.channel.findUnique.mockResolvedValue(mockChannel);

    const result = await service.getOrSyncLatestVideo('ch-1', undefined, false);
    expect(result).toHaveProperty('title', 'Vídeo em Cache');
    expect(youtubeService.getMockLatestVideo).not.toHaveBeenCalled();
    expect(prismaService.video.upsert).not.toHaveBeenCalled();
  });

  it('should upsert latest video when forced refresh is true', async () => {
    const mockChannel = {
      id: 'ch-1',
      title: 'Canal Teste',
      youtubeChannelId: 'UC_001',
      videos: [],
    };

    prismaService.channel.findUnique.mockResolvedValue(mockChannel);
    prismaService.video.upsert.mockResolvedValue({
      id: 'v-new',
      youtubeVideoId: 'yt_mock_123',
      title: 'Vídeo Teste Recente',
    });

    const result = await service.getOrSyncLatestVideo('ch-1', undefined, true);
    expect(youtubeService.getMockLatestVideo).toHaveBeenCalledWith('UC_001');
    expect(prismaService.video.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          channelId_youtubeVideoId: {
            channelId: 'ch-1',
            youtubeVideoId: 'yt_mock_123',
          },
        },
      }),
    );
    expect(result).toHaveProperty('title', 'Vídeo Teste Recente');
  });
});
