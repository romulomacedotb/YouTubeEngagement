import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeService } from '../youtube/youtube.service';
import { AuthService } from '../auth/auth.service';
import { PreviewEngagementDto } from './dto/preview-engagement.dto';
import { ExecuteEngagementDto } from './dto/execute-engagement.dto';
import { BatchEngagementDto } from './dto/batch-engagement.dto';
import type {
  EngagementActionDto,
  PaginatedResponse,
  BatchEngagementResult,
  BatchEngagementChannelResult,
  EngagementActionType,
} from '@youtube-engagement/shared';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youtube: YouTubeService,
    private readonly auth: AuthService,
  ) {}

  async preview(dto: PreviewEngagementDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: dto.channelId },
    });
    if (!channel) {
      throw new NotFoundException(`Canal com ID ${dto.channelId} não encontrado.`);
    }

    let video = null;
    if (dto.videoId) {
      video = await this.prisma.video.findUnique({ where: { id: dto.videoId } });
    } else {
      video = await this.prisma.video.findFirst({
        where: { channelId: channel.id },
        orderBy: { publishedAt: 'desc' },
      });
    }

    let templateContent = dto.customText || '';
    if (dto.templateId) {
      const template = await this.prisma.commentTemplate.findUnique({
        where: { id: dto.templateId },
      });
      if (template) {
        templateContent = template.content;
      }
    }

    const availableVariables: Record<string, string> = {
      nome_canal: channel.title,
      titulo_canal: channel.title,
      titulo_video: video ? video.title : 'seu conteúdo recente',
      url_video: video ? video.url : `https://www.youtube.com/channel/${channel.youtubeChannelId}`,
      assunto: dto.variables?.assunto || 'vídeo novo',
      ...(dto.variables || {}),
    };

    let renderedComment = templateContent;
    for (const [key, value] of Object.entries(availableVariables)) {
      renderedComment = renderedComment.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    // Check if there was already an interaction with this channel/video in the last 7 days
    const recentAction = await this.prisma.engagementAction.findFirst({
      where: {
        channelId: channel.id,
        videoId: video ? video.id : undefined,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      channelTitle: channel.title,
      videoTitle: video ? video.title : undefined,
      videoUrl: video ? video.url : undefined,
      renderedComment,
      availableVariables,
      hasRecentAction: !!recentAction,
      recentActionDate: recentAction ? recentAction.createdAt.toISOString() : undefined,
      recentActionStatus: recentAction ? recentAction.status : undefined,
    };
  }

  async execute(dto: ExecuteEngagementDto) {
    // Validations: No indiscriminate bulk automation. Individual confirmation is required.
    const channel = await this.prisma.channel.findUnique({ where: { id: dto.channelId } });
    if (!channel) {
      throw new NotFoundException(`Canal não encontrado.`);
    }

    // Idempotency check: prevent duplicate accidental submissions within 60 seconds
    const duplicateWindow = new Date(Date.now() - 60 * 1000);
    const existing = await this.prisma.engagementAction.findFirst({
      where: {
        channelId: dto.channelId,
        videoId: dto.videoId || null,
        type: dto.type,
        commentText: dto.commentText || null,
        createdAt: { gte: duplicateWindow },
      },
    });

    if (existing) {
      this.logger.log(`Ação idêntica detectada dentro da janela de idempotência para canal ${channel.title}. Reutilizando ID ${existing.id}.`);
      return {
        success: true,
        actionId: existing.id,
        isDuplicate: true,
        message: 'Ação idêntica já registrada anteriormente (proteção contra duplicação).',
      };
    }

    const actionStatus = dto.status || 'CONFIRMED';
    const now = new Date();

    const action = await this.prisma.engagementAction.create({
      data: {
        channelId: dto.channelId,
        videoId: dto.videoId || null,
        type: dto.type,
        status: actionStatus,
        commentText: dto.commentText || null,
        notes: dto.notes || (dto.idempotencyKey ? `IdempotencyKey: ${dto.idempotencyKey}` : null),
        confirmedAt: actionStatus === 'CONFIRMED' || actionStatus === 'COPIED' ? now : null,
        executedAt: actionStatus === 'COPIED' ? now : null,
      },
    });

    // Create Audit Log entry
    await this.prisma.auditLog.create({
      data: {
        action: `ENGAGEMENT_${actionStatus}`,
        entity: 'EngagementAction',
        entityId: action.id,
        details: JSON.stringify({
          channelTitle: channel.title,
          type: dto.type,
          videoId: dto.videoId,
          status: actionStatus,
        }),
      },
    });

    this.logger.log(`Ação de engajamento [${actionStatus}] criada para canal ${channel.title} (ID: ${action.id})`);

    return {
      success: true,
      actionId: action.id,
      isDuplicate: false,
      message: 'Ação confirmada e registrada com sucesso no histórico de interações.',
    };
  }

  async getHistory(params: {
    channelId?: string;
    status?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<EngagementActionDto>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.channelId) where.channelId = params.channelId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;

    const [total, records] = await Promise.all([
      this.prisma.engagementAction.count({ where }),
      this.prisma.engagementAction.findMany({
        where,
        include: {
          channel: {
            select: {
              id: true,
              title: true,
              thumbnailUrl: true,
              youtubeChannelId: true,
            },
          },
          video: {
            select: {
              id: true,
              title: true,
              url: true,
              publishedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items: EngagementActionDto[] = records.map((r) => ({
      id: r.id,
      channelId: r.channelId,
      channelTitle: r.channel?.title,
      channelThumbnail: r.channel?.thumbnailUrl,
      videoId: r.videoId,
      videoTitle: r.video?.title,
      videoUrl: r.video?.url,
      type: r.type as any,
      status: r.status as any,
      commentText: r.commentText,
      notes: r.notes,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
      executedAt: r.executedAt ? r.executedAt.toISOString() : null,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getActionById(id: string): Promise<EngagementActionDto> {
    const r = await this.prisma.engagementAction.findUnique({
      where: { id },
      include: {
        channel: true,
        video: true,
      },
    });

    if (!r) {
      throw new NotFoundException(`Ação com ID ${id} não encontrada.`);
    }

    return {
      id: r.id,
      channelId: r.channelId,
      channelTitle: r.channel?.title,
      channelThumbnail: r.channel?.thumbnailUrl,
      videoId: r.videoId,
      videoTitle: r.video?.title,
      videoUrl: r.video?.url,
      type: r.type as any,
      status: r.status as any,
      commentText: r.commentText,
      notes: r.notes,
      confirmedAt: r.confirmedAt ? r.confirmedAt.toISOString() : null,
      executedAt: r.executedAt ? r.executedAt.toISOString() : null,
      error: r.error,
      createdAt: r.createdAt.toISOString(),
    };
  }

  async updateActionStatus(id: string, status: string, notes?: string) {
    const action = await this.prisma.engagementAction.findUnique({ where: { id } });
    if (!action) {
      throw new NotFoundException(`Ação não encontrada.`);
    }

    const updated = await this.prisma.engagementAction.update({
      where: { id },
      data: {
        status,
        notes: notes !== undefined ? notes : action.notes,
        executedAt: status === 'COPIED' || status === 'EXECUTED' ? new Date() : action.executedAt,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: `ENGAGEMENT_STATUS_UPDATED`,
        entity: 'EngagementAction',
        entityId: id,
        details: JSON.stringify({ oldStatus: action.status, newStatus: status }),
      },
    });

    return updated;
  }

  async deleteAction(id: string) {
    const action = await this.prisma.engagementAction.findUnique({ where: { id } });
    if (!action) {
      throw new NotFoundException(`Ação não encontrada.`);
    }

    await this.prisma.engagementAction.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        action: `ENGAGEMENT_ACTION_DELETED`,
        entity: 'EngagementAction',
        entityId: id,
      },
    });

    return { success: true, message: 'Ação removida do histórico.' };
  }

  async executeBatch(dto: BatchEngagementDto, sessionCookie?: string): Promise<BatchEngagementResult> {
    if (!dto.channelIds || dto.channelIds.length === 0) {
      throw new BadRequestException('Nenhum canal foi selecionado para interação.');
    }

    const actionTypes = dto.actionTypes && dto.actionTypes.length > 0 ? dto.actionTypes : ['COMMENT', 'LIKE'];
    const skipAlreadyInteracted = dto.skipAlreadyInteracted !== false;

    // Get active access token if user is authenticated
    let accessToken: string | null = null;
    try {
      const account = await this.auth.getAccountFromSession(sessionCookie);
      if (account) {
        accessToken = await this.auth.getValidAccessToken(account.id);
      }
    } catch (err: any) {
      this.logger.warn(`Não foi possível obter token da sessão: ${err.message}`);
    }

    const results: BatchEngagementChannelResult[] = [];
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const channelId of dto.channelIds) {
      const channel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          videos: {
            take: 1,
            orderBy: { publishedAt: 'desc' },
          },
          actions: {
            where: { status: { in: ['CONFIRMED', 'COPIED', 'EXECUTED'] } },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!channel) {
        errorCount++;
        results.push({
          channelId,
          channelTitle: 'Canal desconhecido',
          commentSent: false,
          liked: false,
          skipped: false,
          error: 'Canal não encontrado no banco de dados.',
        });
        continue;
      }

      // Check if channel has a video, or attempt to fetch on demand
      let video = channel.videos[0];
      if (!video && channel.youtubeChannelId) {
        try {
          const isMock = !accessToken || accessToken.startsWith('mock-');
          const fetched = isMock
            ? this.youtube.getMockLatestVideo(channel.youtubeChannelId)
            : await this.youtube.fetchLatestVideoForChannel(accessToken, channel.youtubeChannelId);
          if (fetched) {
            video = await this.prisma.video.upsert({
              where: { youtubeVideoId: fetched.youtubeVideoId },
              update: {
                title: fetched.title,
                url: fetched.url,
                publishedAt: fetched.publishedAt,
                thumbnailUrl: fetched.thumbnailUrl,
                viewCount: fetched.viewCount,
                likeCount: fetched.likeCount,
                commentCount: fetched.commentCount,
                checkedAt: new Date(),
              },
              create: {
                channelId: channel.id,
                youtubeVideoId: fetched.youtubeVideoId,
                title: fetched.title,
                url: fetched.url,
                publishedAt: fetched.publishedAt,
                thumbnailUrl: fetched.thumbnailUrl,
                viewCount: fetched.viewCount,
                likeCount: fetched.likeCount,
                commentCount: fetched.commentCount,
                checkedAt: new Date(),
              },
            });
          }
        } catch (fetchErr: any) {
          this.logger.warn(`Falha ao obter vídeo recente do canal ${channel.title}: ${fetchErr.message}`);
        }
      }

      if (!video) {
        skippedCount++;
        results.push({
          channelId: channel.id,
          channelTitle: channel.title,
          commentSent: false,
          liked: false,
          skipped: true,
          skipReason: 'Canal não possui vídeos públicos publicados para interagir.',
        });
        continue;
      }

      // Check if already interacted
      const alreadyCommented = channel.actions.some(
        (a) => ['COMMENT', 'COMMENT_AND_LIKE'].includes(a.type as any) && (a.videoId === video.id || !a.videoId),
      );
      const alreadyLiked = channel.actions.some(
        (a) => ['LIKE', 'COMMENT_AND_LIKE'].includes(a.type as any) && (a.videoId === video.id || !a.videoId),
      );

      const shouldComment = actionTypes.includes('COMMENT') && (!skipAlreadyInteracted || !alreadyCommented);
      const shouldLike = actionTypes.includes('LIKE') && (!skipAlreadyInteracted || !alreadyLiked);

      if (!shouldComment && !shouldLike) {
        skippedCount++;
        results.push({
          channelId: channel.id,
          channelTitle: channel.title,
          videoId: video.id,
          videoTitle: video.title,
          commentSent: false,
          liked: false,
          skipped: true,
          skipReason: 'Vídeo já recebeu comentário e curtida anteriormente.',
        });
        continue;
      }

      // Render comment text if commenting
      let renderedComment = '';
      if (shouldComment) {
        let templateContent = dto.commentText || '';
        if (dto.templateId && !templateContent) {
          const template = await this.prisma.commentTemplate.findUnique({
            where: { id: dto.templateId },
          });
          if (template) {
            templateContent = template.content;
          }
        }
        if (!templateContent) {
          templateContent = 'Excelente conteúdo no canal {nome_canal}! Parabéns pelo vídeo {titulo_video} 👏';
        }

        const availableVariables: Record<string, string> = {
          nome_canal: channel.title,
          titulo_canal: channel.title,
          titulo_video: video.title,
          url_video: video.url,
          assunto: dto.variables?.assunto || 'vídeo novo',
          ...(dto.variables || {}),
        };

        renderedComment = templateContent;
        for (const [key, value] of Object.entries(availableVariables)) {
          renderedComment = renderedComment.replace(new RegExp(`{${key}}`, 'g'), value);
        }
      }

      // Execute actions
      let commentSent = false;
      let liked = false;
      const errors: string[] = [];

      if (shouldLike) {
        try {
          const likeRes = await this.youtube.likeVideo(accessToken, video.youtubeVideoId);
          if (likeRes.success) {
            liked = true;
          } else if (likeRes.error) {
            errors.push(`Curtida: ${likeRes.error}`);
          }
        } catch (likeErr: any) {
          this.logger.error(`Erro ao curtir vídeo ${video.youtubeVideoId} de ${channel.title}: ${likeErr.message}`);
          errors.push(`Curtida: ${likeErr.message}`);
        }
      }

      if (shouldComment) {
        try {
          const commentRes = await this.youtube.postComment(accessToken, video.youtubeVideoId, renderedComment);
          if (commentRes.commentId) {
            commentSent = true;
          } else if (commentRes.error) {
            errors.push(`Comentário: ${commentRes.error}`);
          }
        } catch (commentErr: any) {
          this.logger.error(`Erro ao postar comentário no vídeo ${video.youtubeVideoId} de ${channel.title}: ${commentErr.message}`);
          errors.push(`Comentário: ${commentErr.message}`);
        }
      }

      const hasSucceeded = commentSent || liked;
      if (hasSucceeded) {
        successCount++;
      } else {
        errorCount++;
      }

      // Persist engagement action record
      let recordType: EngagementActionType = 'COMMENT';
      if (commentSent && liked) {
        recordType = 'COMMENT_AND_LIKE';
      } else if (liked) {
        recordType = 'LIKE';
      }

      const status = hasSucceeded ? 'EXECUTED' : 'FAILED';
      const now = new Date();

      await this.prisma.engagementAction.create({
        data: {
          channelId: channel.id,
          videoId: video.id,
          type: recordType,
          status,
          commentText: commentSent ? renderedComment : null,
          notes: `Lote: ${liked ? 'curtido ' : ''}${commentSent ? 'comentado' : ''}`,
          confirmedAt: now,
          executedAt: hasSucceeded ? now : null,
          error: errors.length > 0 ? errors.join('; ') : null,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          action: `ENGAGEMENT_BATCH_${status}`,
          entity: 'EngagementAction',
          entityId: channel.id,
          details: JSON.stringify({
            channelTitle: channel.title,
            videoTitle: video.title,
            commentSent,
            liked,
            type: recordType,
            status,
            errors,
          }),
        },
      });

      results.push({
        channelId: channel.id,
        channelTitle: channel.title,
        videoId: video.id,
        videoTitle: video.title,
        commentSent,
        liked,
        skipped: false,
        commentText: commentSent ? renderedComment : undefined,
        error: errors.length > 0 ? errors.join('; ') : undefined,
      });

      // Small throttling delay to avoid API burst limits
      await new Promise((r) => setTimeout(r, 150));
    }

    return {
      totalProcessed: dto.channelIds.length,
      successCount,
      skippedCount,
      errorCount,
      results,
    };
  }
}
