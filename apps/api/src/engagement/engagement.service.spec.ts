import { Test, TestingModule } from '@nestjs/testing';
import { EngagementService } from './engagement.service';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EngagementService', () => {
  let service: EngagementService;
  let prisma: any;
  let youtube: any;
  let auth: any;

  beforeEach(async () => {
    prisma = {
      channel: {
        findUnique: jest.fn(),
      },
      video: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      commentTemplate: {
        findUnique: jest.fn(),
      },
      engagementAction: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    youtube = {
      likeVideo: jest.fn().mockResolvedValue({ success: true }),
      postComment: jest.fn().mockResolvedValue({ commentId: 'mock-comment-123' }),
      fetchLatestVideoForChannel: jest.fn(),
      getMockLatestVideo: jest.fn(),
    };

    auth = {
      getAccountFromSession: jest.fn().mockResolvedValue(null),
      getValidAccessToken: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: YouTubeService, useValue: youtube },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();

    service = module.get<EngagementService>(EngagementService);
  });

  describe('preview', () => {
    it('deve gerar prévia com interpolação de variáveis e fallback do vídeo mais recente', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Tech Insights Brasil',
        youtubeChannelId: 'UC123',
      });
      prisma.video.findFirst.mockResolvedValue({
        id: 'v1',
        title: 'Como Escalar Node.js',
        url: 'https://youtube.com/watch?v=abc',
      });
      prisma.engagementAction.findFirst.mockResolvedValue(null);

      const res = await service.preview({
        channelId: 'c1',
        customText: 'Olá {nome_canal}, gostei muito de {titulo_video}!',
      });

      expect(res.channelTitle).toBe('Tech Insights Brasil');
      expect(res.videoTitle).toBe('Como Escalar Node.js');
      expect(res.renderedComment).toBe('Olá Tech Insights Brasil, gostei muito de Como Escalar Node.js!');
      expect(res.hasRecentAction).toBe(false);
    });

    it('deve interpolar a variável {assunto} fornecida dinamicamente', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Canal Criativo',
        youtubeChannelId: 'UC456',
      });
      prisma.video.findFirst.mockResolvedValue(null);
      prisma.engagementAction.findFirst.mockResolvedValue(null);

      const res = await service.preview({
        channelId: 'c1',
        customText: 'Oi {nome_canal}, parabéns por abordar o assunto {assunto}.',
        variables: { assunto: 'Inteligência Artificial' },
      });

      expect(res.renderedComment).toBe('Oi Canal Criativo, parabéns por abordar o assunto Inteligência Artificial.');
    });

    it('deve lançar NotFoundException se o canal não existir', async () => {
      prisma.channel.findUnique.mockResolvedValue(null);

      await expect(
        service.preview({ channelId: 'inexistente', customText: 'Teste' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('execute', () => {
    it('deve registrar ação confirmada e registrar no audit log', async () => {
      prisma.channel.findUnique.mockResolvedValue({ id: 'c1', title: 'Tech Insights' });
      prisma.engagementAction.findFirst.mockResolvedValue(null); // Sem duplicata
      prisma.engagementAction.create.mockResolvedValue({
        id: 'act-1',
        channelId: 'c1',
        type: 'COMMENT',
        status: 'CONFIRMED',
      });
      prisma.auditLog.create.mockResolvedValue({ id: 'aud-1' });

      const res = await service.execute({
        channelId: 'c1',
        videoId: 'v1',
        type: 'COMMENT',
        commentText: 'Ótimo vídeo!',
      });

      expect(res.success).toBe(true);
      expect(res.actionId).toBe('act-1');
      expect(res.isDuplicate).toBe(false);
      expect(prisma.engagementAction.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve aplicar idempotência e não duplicar se a mesma ação foi enviada recentemente', async () => {
      prisma.channel.findUnique.mockResolvedValue({ id: 'c1', title: 'Tech Insights' });
      prisma.engagementAction.findFirst.mockResolvedValue({
        id: 'act-existing',
        channelId: 'c1',
        type: 'COMMENT',
        status: 'CONFIRMED',
      });

      const res = await service.execute({
        channelId: 'c1',
        videoId: 'v1',
        type: 'COMMENT',
        commentText: 'Ótimo vídeo!',
      });

      expect(res.success).toBe(true);
      expect(res.actionId).toBe('act-existing');
      expect(res.isDuplicate).toBe(true);
      expect(prisma.engagementAction.create).not.toHaveBeenCalled();
    });
  });

  describe('getHistory', () => {
    it('deve retornar lista paginada de ações formatadas', async () => {
      prisma.engagementAction.count.mockResolvedValue(1);
      prisma.engagementAction.findMany.mockResolvedValue([
        {
          id: 'act-1',
          channelId: 'c1',
          type: 'COMMENT',
          status: 'COPIED',
          commentText: 'Parabéns!',
          createdAt: new Date(),
          channel: { title: 'Tech Insights', thumbnailUrl: null },
          video: { title: 'Node.js', url: 'https://...' },
        },
      ]);

      const res = await service.getHistory({ page: 1, pageSize: 10 });
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].status).toBe('COPIED');
      expect(res.items[0].channelTitle).toBe('Tech Insights');
    });
  });

  describe('executeBatch', () => {
    it('deve interagir em lote (comentar e curtir) para os canais selecionados', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Canal Teste',
        youtubeChannelId: 'UC999',
        videos: [
          {
            id: 'v1',
            youtubeVideoId: 'yt-v1',
            title: 'Vídeo Novo',
            url: 'https://youtube.com/watch?v=yt-v1',
          },
        ],
        actions: [],
      });
      prisma.engagementAction.create.mockResolvedValue({ id: 'act-batch-1' });
      prisma.auditLog.create.mockResolvedValue({ id: 'aud-batch-1' });

      const res = await service.executeBatch({
        channelIds: ['c1'],
        actionTypes: ['COMMENT', 'LIKE'],
        commentText: 'Excelente vídeo {titulo_video}!',
        skipAlreadyInteracted: true,
      });

      expect(res.totalProcessed).toBe(1);
      expect(res.successCount).toBe(1);
      expect(res.skippedCount).toBe(0);
      expect(res.results[0].commentSent).toBe(true);
      expect(res.results[0].liked).toBe(true);
      expect(youtube.likeVideo).toHaveBeenCalledWith(null, 'yt-v1');
      expect(youtube.postComment).toHaveBeenCalledWith(null, 'yt-v1', 'Excelente vídeo Vídeo Novo!');
    });

    it('deve pular canais que já foram interagidos se skipAlreadyInteracted for true', async () => {
      prisma.channel.findUnique.mockResolvedValue({
        id: 'c1',
        title: 'Canal Já Interagido',
        youtubeChannelId: 'UC999',
        videos: [
          {
            id: 'v1',
            youtubeVideoId: 'yt-v1',
            title: 'Vídeo Já Visto',
          },
        ],
        actions: [
          {
            videoId: 'v1',
            type: 'COMMENT_AND_LIKE',
            status: 'EXECUTED',
          },
        ],
      });

      const res = await service.executeBatch({
        channelIds: ['c1'],
        actionTypes: ['COMMENT', 'LIKE'],
        skipAlreadyInteracted: true,
      });

      expect(res.totalProcessed).toBe(1);
      expect(res.skippedCount).toBe(1);
      expect(res.successCount).toBe(0);
      expect(res.results[0].skipped).toBe(true);
      expect(youtube.likeVideo).not.toHaveBeenCalled();
      expect(youtube.postComment).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException se channelIds for vazio', async () => {
      await expect(
        service.executeBatch({
          channelIds: [],
          actionTypes: ['COMMENT'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

