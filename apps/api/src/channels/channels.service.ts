import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';
import { VideosService } from '../videos/videos.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeService,
    private readonly auth: AuthService,
    private readonly videos: VideosService,
  ) {}

  async findOne(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        videos: {
          orderBy: { publishedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!channel) {
      throw new NotFoundException(`Canal com ID ${id} não encontrado.`);
    }

    return channel;
  }

  async syncSingleChannel(id: string, sessionCookie?: string) {
    const channel = await this.findOne(id);
    const account = await this.auth.getAccountFromSession(sessionCookie);

    const job = await this.prisma.syncJob.create({
      data: {
        type: 'CHANNEL_REFRESH',
        status: 'RUNNING',
        startedAt: new Date(),
        processedCount: 0,
        metadata: JSON.stringify({ channelId: channel.id, ytId: channel.youtubeChannelId }),
      },
    });

    try {
      let accessToken: string | null = null;
      if (account) {
        accessToken = await this.auth.getValidAccessToken(account.id);
      }

      if (accessToken && !accessToken.startsWith('mock-')) {
        const details = await this.youtube.fetchChannelDetails(accessToken, channel.youtubeChannelId);
        if (details) {
          await this.prisma.channel.update({
            where: { id: channel.id },
            data: {
              title: details.title || channel.title,
              description: details.description || channel.description,
              customUrl: details.customUrl || channel.customUrl,
              thumbnailUrl: details.thumbnailUrl || channel.thumbnailUrl,
              subscriberCount: details.subscriberCount ?? channel.subscriberCount,
              videoCount: details.videoCount ?? channel.videoCount,
              lastSyncedAt: new Date(),
            },
          });
        }
      } else {
        // Dev/Mock update: refresh lastSyncedAt
        await this.prisma.channel.update({
          where: { id: channel.id },
          data: {
            lastSyncedAt: new Date(),
          },
        });
      }

      // Also refresh latest video for this channel
      await this.videos.getOrSyncLatestVideo(channel.id, sessionCookie, true).catch(() => null);

      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          processedCount: 1,
        },
      });

      return {
        jobId: job.id,
        message: `Canal ${channel.title} e seu vídeo mais recente sincronizados com sucesso.`,
      };
    } catch (err: any) {
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: err.message,
        },
      });
      throw err;
    }
  }

  async getLatestVideo(id: string, sessionCookie?: string) {
    return this.videos.getOrSyncLatestVideo(id, sessionCookie, false);
  }

  async forceSyncLatestVideo(id: string, sessionCookie?: string) {
    return this.videos.getOrSyncLatestVideo(id, sessionCookie, true);
  }
}
