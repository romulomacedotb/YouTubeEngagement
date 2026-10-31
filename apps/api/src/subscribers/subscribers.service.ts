import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService, FetchedSubscriberItem } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';
import { ChannelFilterParams, PaginatedResponse, ChannelSummary } from '@youtube-engagement/shared';

@Injectable()
export class SubscribersService {
  private readonly logger = new Logger(SubscribersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Initiates a background subscriber synchronization job
   */
  async startSync(sessionCookie?: string): Promise<{ jobId: string; message: string }> {
    const account = await this.auth.getAccountFromSession(sessionCookie);

    const job = await this.prisma.syncJob.create({
      data: {
        type: 'SUBSCRIBERS',
        status: 'PENDING',
        processedCount: 0,
        errorCount: 0,
        metadata: JSON.stringify({
          accountId: account?.id || null,
          channelTitle: account?.channelTitle || 'Canal Desconhecido',
        }),
      },
    });

    // Run async in background without blocking response
    this.runSync(job.id, account?.id).catch((err) => {
      this.logger.error(`Erro assíncrono na sincronização (Job ${job.id}): ${err.message}`);
    });

    return {
      jobId: job.id,
      message: 'Tarefa de sincronização criada com sucesso e em execução.',
    };
  }

  /**
   * Background processor for subscriber sync
   */
  async runSync(jobId: string, accountId?: string) {
    this.logger.log(`Executando tarefa de sincronização de inscritos (Job ID: ${jobId})...`);

    await this.prisma.syncJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    let newCount = 0;
    let updatedCount = 0;
    let processedCount = 0;
    let errorCount = 0;

    try {
      let accessToken: string | null = null;
      if (accountId) {
        accessToken = await this.auth.getValidAccessToken(accountId);
      }

      const allItems: FetchedSubscriberItem[] = [];

      // Check if real Google Access Token or Fallback to Mock Data (dev/demo mode)
      const isMockToken = !accessToken || accessToken.startsWith('mock-');

      if (isMockToken) {
        this.logger.log('Utilizando gerador seguro de inscritos acessíveis de teste (Dev/Mock mode)...');
        const mockItems = this.youtube.getMockSubscribers();
        allItems.push(...mockItems);
      } else {
        // Fetch pages with safety limit (e.g. max 5 pages = 250 subscribers per run) to protect quotas
        let pageToken: string | undefined = undefined;
        let pagesCount = 0;
        const maxPages = 5;

        do {
          const result = await this.youtube.fetchSubscribersPage(accessToken!, pageToken, 50);
          allItems.push(...result.items);
          pageToken = result.nextPageToken || undefined;
          pagesCount++;
        } while (pageToken && pagesCount < maxPages);
      }

      let effectiveAccountId = accountId;
      if (!effectiveAccountId) {
        const defaultAccount =
          (await this.prisma.oAuthAccount?.findFirst?.({
            where: { clientConfig: { isDefault: true } },
          })) || (await this.prisma.oAuthAccount?.findFirst?.());
        effectiveAccountId = defaultAccount?.id || 'dev-account';
      }

      // Persist results idempotently into SQLite
      for (const item of allItems) {
        try {
          const existing = await this.prisma.channel.findUnique({
            where: {
              accountId_youtubeChannelId: {
                accountId: effectiveAccountId,
                youtubeChannelId: item.youtubeChannelId,
              },
            },
          });

          await this.prisma.channel.upsert({
            where: {
              accountId_youtubeChannelId: {
                accountId: effectiveAccountId,
                youtubeChannelId: item.youtubeChannelId,
              },
            },
            update: {
              title: item.title,
              description: item.description || null,
              thumbnailUrl: item.thumbnailUrl || null,
              customUrl: item.customUrl || null,
              subscriberCount: item.subscriberCount || null,
              videoCount: item.videoCount || null,
              lastSyncedAt: new Date(),
            },
            create: {
              accountId: effectiveAccountId,
              youtubeChannelId: item.youtubeChannelId,
              title: item.title,
              description: item.description || null,
              thumbnailUrl: item.thumbnailUrl || null,
              customUrl: item.customUrl || null,
              subscriberCount: item.subscriberCount || null,
              videoCount: item.videoCount || null,
              lastSyncedAt: new Date(),
            },
          });

          if (existing) {
            updatedCount++;
          } else {
            newCount++;
          }
          processedCount++;

          // Periodic progress update in SyncJob every 10 items
          if (processedCount % 10 === 0) {
            await this.prisma.syncJob.update({
              where: { id: jobId },
              data: { processedCount },
            });
          }
        } catch (itemErr: any) {
          errorCount++;
          this.logger.warn(`Erro ao persistir canal ${item.youtubeChannelId}: ${itemErr.message}`);
        }
      }

      // Complete Job
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          finishedAt: new Date(),
          processedCount,
          errorCount,
          metadata: JSON.stringify({
            newCount,
            updatedCount,
            totalFound: allItems.length,
          }),
        },
      });

      // Audit Log
      await this.prisma.auditLog.create({
        data: {
          action: 'SYNC_SUBSCRIBERS_COMPLETED',
          entity: 'SyncJob',
          entityId: jobId,
          details: `Sincronização concluída: ${newCount} novos, ${updatedCount} atualizados.`,
        },
      });

      this.logger.log(
        `Job ${jobId} finalizado com sucesso: ${processedCount} inscritos processados (${newCount} novos, ${updatedCount} atualizados).`,
      );
    } catch (err: any) {
      this.logger.error(`Falha no Job ${jobId}: ${err.message}`);
      await this.prisma.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: err.message || 'Erro durante a sincronização.',
          errorCount: errorCount + 1,
        },
      });
    }
  }

  /**
   * Queries stored channels with search, filters, sorting and pagination
   */
  async listSubscribers(
    params: ChannelFilterParams,
    sessionCookie?: string,
  ): Promise<PaginatedResponse<ChannelSummary>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    let account = sessionCookie ? await this.auth.getAccountFromSession(sessionCookie) : null;
    if (account) {
      where.accountId = account.id;
    }

    if (params.search) {
      const search = params.search.trim();
      where.OR = [
        { title: { contains: search } },
        { customUrl: { contains: search } },
        { youtubeChannelId: { contains: search } },
      ];
    }

    if (params.hasLatestVideo === true || (params.hasLatestVideo as any) === 'true') {
      where.videos = { some: {} };
    }

    if (params.engagementStatus === 'pending') {
      where.actions = {
        none: {
          status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] },
        },
      };
    } else if (params.engagementStatus === 'commented') {
      where.actions = {
        some: {
          type: { in: ['COMMENT', 'COMMENT_AND_LIKE'] },
          status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] },
        },
      };
    } else if (params.engagementStatus === 'liked') {
      where.actions = {
        some: {
          type: { in: ['LIKE', 'COMMENT_AND_LIKE'] },
          status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] },
        },
      };
    } else if (params.engagementStatus === 'both') {
      where.AND = [
        {
          actions: {
            some: {
              type: { in: ['COMMENT', 'COMMENT_AND_LIKE'] },
              status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] },
            },
          },
        },
        {
          actions: {
            some: {
              type: { in: ['LIKE', 'COMMENT_AND_LIKE'] },
              status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] },
            },
          },
        },
      ];
    }

    let orderBy: any = { lastSyncedAt: 'desc' };
    const sortBy = params.sortBy || 'lastSyncedAt';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';

    if (sortBy === 'title') {
      orderBy = { title: sortOrder };
    } else if (sortBy === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'subscriberCount') {
      orderBy = { subscriberCount: sortOrder };
    } else if (sortBy === 'videoCount') {
      orderBy = { videoCount: sortOrder };
    } else if (sortBy === 'lastSyncedAt') {
      orderBy = { lastSyncedAt: sortOrder };
    }

    const [items, total] = await Promise.all([
      this.prisma.channel.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          videos: {
            take: 1,
            orderBy: { publishedAt: 'desc' },
          },
          actions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      }),
      this.prisma.channel.count({ where }),
    ]);

    const formattedItems: ChannelSummary[] = items.map((c) => {
      const actions = c.actions || [];
      const successfulActions = actions.filter((a) =>
        ['CONFIRMED', 'COPIED', 'EXECUTED'].includes(a.status),
      );
      const hasCommented = successfulActions.some((a) =>
        ['COMMENT', 'COMMENT_AND_LIKE'].includes(a.type),
      );
      const hasLiked = successfulActions.some((a) =>
        ['LIKE', 'COMMENT_AND_LIKE'].includes(a.type),
      );
      const lastAction = successfulActions[0];

      return {
        id: c.id,
        youtubeChannelId: c.youtubeChannelId,
        title: c.title,
        thumbnailUrl: c.thumbnailUrl,
        description: c.description,
        customUrl: c.customUrl,
        subscriberCount: c.subscriberCount,
        videoCount: c.videoCount,
        lastSyncedAt: c.lastSyncedAt ? c.lastSyncedAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        hasCommented,
        hasLiked,
        lastEngagementDate: lastAction ? lastAction.createdAt.toISOString() : null,
        lastEngagementStatus: lastAction ? lastAction.status : null,
        latestVideo: c.videos[0]
          ? {
              id: c.videos[0].id,
              youtubeVideoId: c.videos[0].youtubeVideoId,
              channelId: c.videos[0].channelId,
              title: c.videos[0].title,
              url: c.videos[0].url,
              publishedAt: c.videos[0].publishedAt.toISOString(),
              checkedAt: c.videos[0].checkedAt.toISOString(),
              thumbnailUrl: c.videos[0].thumbnailUrl,
              viewCount: c.videos[0].viewCount,
              likeCount: c.videos[0].likeCount,
              commentCount: c.videos[0].commentCount,
            }
          : null,
      };
    });

    return {
      items: formattedItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }
}
