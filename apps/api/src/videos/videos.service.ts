import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService, FetchedVideoItem } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeService,
    private readonly auth: AuthService,
  ) {}

  async findOne(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: { channel: true },
    });

    if (!video) {
      throw new NotFoundException(`Vídeo com ID ${id} não encontrado.`);
    }

    return video;
  }

  /**
   * Retrieves or updates the latest public video for a channel using smart caching
   */
  async getOrSyncLatestVideo(
    channelId: string,
    sessionCookie?: string,
    forceRefresh: boolean = false,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Canal com ID ${channelId} não encontrado.`);
    }

    const existingVideo = channel.videos[0];
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    // Cache check: if verified within last 6 hours and not forcing refresh, return cached video
    if (existingVideo && existingVideo.checkedAt > sixHoursAgo && !forceRefresh) {
      return existingVideo;
    }

    // Otherwise, fetch latest video via YouTube API
    const account = await this.auth.getAccountFromSession(sessionCookie);
    let accessToken: string | null = null;
    if (account) {
      accessToken = await this.auth.getValidAccessToken(account.id);
    }

    let fetchedVideo: FetchedVideoItem | null = null;
    const isMock = !accessToken || accessToken.startsWith('mock-');

    if (isMock) {
      fetchedVideo = this.youtube.getMockLatestVideo(channel.youtubeChannelId);
    } else {
      fetchedVideo = await this.youtube.fetchLatestVideoForChannel(
        accessToken!,
        channel.youtubeChannelId,
      );
    }

    if (!fetchedVideo) {
      this.logger.log(`Nenhum vídeo público identificado para o canal: ${channel.title}`);
      return (
        existingVideo || {
          message: 'Nenhum vídeo público identificado para este canal.',
          channelId: channel.id,
        }
      );
    }

    // Upsert into Video table
    const savedVideo = await this.prisma.video.upsert({
      where: { youtubeVideoId: fetchedVideo.youtubeVideoId },
      update: {
        channelId: channel.id,
        title: fetchedVideo.title,
        description: fetchedVideo.description || null,
        url: fetchedVideo.url,
        publishedAt: fetchedVideo.publishedAt,
        checkedAt: new Date(),
        thumbnailUrl: fetchedVideo.thumbnailUrl || null,
        viewCount: fetchedVideo.viewCount ?? null,
        likeCount: fetchedVideo.likeCount ?? null,
        commentCount: fetchedVideo.commentCount ?? null,
      },
      create: {
        youtubeVideoId: fetchedVideo.youtubeVideoId,
        channelId: channel.id,
        title: fetchedVideo.title,
        description: fetchedVideo.description || null,
        url: fetchedVideo.url,
        publishedAt: fetchedVideo.publishedAt,
        checkedAt: new Date(),
        thumbnailUrl: fetchedVideo.thumbnailUrl || null,
        viewCount: fetchedVideo.viewCount ?? null,
        likeCount: fetchedVideo.likeCount ?? null,
        commentCount: fetchedVideo.commentCount ?? null,
      },
    });

    this.logger.log(`Vídeo mais recente salvo para ${channel.title}: "${savedVideo.title}"`);
    return savedVideo;
  }

  /**
   * Starts a background job to scan and update the latest video of all stored channels
   */
  async syncLatestVideosForAllChannels(sessionCookie?: string) {
    const job = await this.prisma.syncJob.create({
      data: {
        type: 'LATEST_VIDEOS',
        status: 'PENDING',
        processedCount: 0,
        errorCount: 0,
      },
    });

    this.runSyncLatestVideos(job.id, sessionCookie).catch((err) => {
      this.logger.error(`Erro ao sincronizar vídeos (Job ${job.id}): ${err.message}`);
    });

    return {
      jobId: job.id,
      message: 'Tarefa de atualização de vídeos mais recentes iniciada em segundo plano.',
    };
  }

  /**
   * Background runner for syncing latest videos
   */
  async runSyncLatestVideos(jobId: string, sessionCookie?: string) {
    await this.prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const channels = await this.prisma.channel.findMany();
    let processedCount = 0;
    let errorCount = 0;

    for (const channel of channels) {
      try {
        await this.getOrSyncLatestVideo(channel.id, sessionCookie, true);
        processedCount++;

        if (processedCount % 5 === 0) {
          await this.prisma.syncJob.update({
            where: { id: jobId },
            data: { processedCount },
          });
        }
      } catch (err: any) {
        errorCount++;
        this.logger.warn(`Erro ao sincronizar vídeo do canal ${channel.id}: ${err.message}`);
      }
    }

    await this.prisma.syncJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        processedCount,
        errorCount,
        metadata: JSON.stringify({ totalChannels: channels.length, processed: processedCount }),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'SYNC_LATEST_VIDEOS_COMPLETED',
        entity: 'SyncJob',
        entityId: jobId,
        details: `Atualização de vídeos recentes concluída para ${processedCount} canais.`,
      },
    });
  }
}
