import { Injectable, Logger } from '@nestjs/common';
import { google, youtube_v3 } from 'googleapis';

export interface FetchedSubscriberItem {
  youtubeChannelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  subscriberCount?: number;
  videoCount?: number;
}

export interface FetchSubscribersResult {
  items: FetchedSubscriberItem[];
  nextPageToken?: string | null;
  totalResults?: number;
}

export interface FetchedVideoItem {
  youtubeVideoId: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: Date;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
}

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  /**
   * Instantiates an authenticated YouTube Data API client with given access token
   */
  getYouTubeClient(accessToken: string): youtube_v3.Youtube {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return google.youtube({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Calculates the YouTube uploads playlist ID from channel ID (e.g. UCxxxx -> UUxxxx)
   */
  getUploadsPlaylistId(youtubeChannelId: string): string {
    if (youtubeChannelId.startsWith('UC')) {
      return 'UU' + youtubeChannelId.substring(2);
    }
    return youtubeChannelId;
  }

  /**
   * Fetches the single latest public video uploaded to a channel
   */
  async fetchLatestVideoForChannel(
    accessToken: string,
    youtubeChannelId: string,
  ): Promise<FetchedVideoItem | null> {
    const youtube = this.getYouTubeClient(accessToken);
    const playlistId = this.getUploadsPlaylistId(youtubeChannelId);

    try {
      // 1. Query the channel's uploads playlist items
      const res = await youtube.playlistItems.list({
        part: ['snippet', 'contentDetails'],
        playlistId,
        maxResults: 1,
      });

      const items = res.data.items || [];
      if (items.length === 0) {
        return null;
      }

      const item = items[0];
      const videoId = item.contentDetails?.videoId || (item.snippet as any)?.resourceId?.videoId;
      if (!videoId) {
        return null;
      }

      const snippet = item.snippet;
      const title = snippet?.title || 'Vídeo sem título';
      const description = snippet?.description || '';
      const publishedAt = snippet?.publishedAt ? new Date(snippet.publishedAt) : new Date();
      const thumbnailUrl =
        snippet?.thumbnails?.high?.url ||
        snippet?.thumbnails?.medium?.url ||
        snippet?.thumbnails?.default?.url ||
        undefined;
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      // 2. Fetch video statistics (views, likes)
      let viewCount: number | undefined = undefined;
      let likeCount: number | undefined = undefined;
      let commentCount: number | undefined = undefined;

      try {
        const videoRes = await youtube.videos.list({
          part: ['statistics'],
          id: [videoId],
        });
        const stats = videoRes.data.items?.[0]?.statistics;
        if (stats) {
          viewCount = stats.viewCount ? parseInt(stats.viewCount, 10) : undefined;
          likeCount = stats.likeCount ? parseInt(stats.likeCount, 10) : undefined;
          commentCount = stats.commentCount ? parseInt(stats.commentCount, 10) : undefined;
        }
      } catch (statsErr: any) {
        this.logger.warn(`Não foi possível obter estatísticas do vídeo ${videoId}: ${statsErr.message}`);
      }

      return {
        youtubeVideoId: videoId,
        title,
        description,
        url,
        publishedAt,
        thumbnailUrl,
        viewCount,
        likeCount,
        commentCount,
      };
    } catch (err: any) {
      if (err?.code === 404 || err?.message?.includes('playlistNotFound')) {
        this.logger.log(`Canal ${youtubeChannelId} não possui playlist pública de uploads.`);
        return null;
      }
      this.logger.warn(`Erro ao consultar último vídeo do canal ${youtubeChannelId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetches a page of accessible subscribers via youtube.subscriptions.list
   */
  async fetchSubscribersPage(
    accessToken: string,
    pageToken?: string,
    maxResults: number = 50,
  ): Promise<FetchSubscribersResult> {
    const youtube = this.getYouTubeClient(accessToken);

    try {
      const response = await youtube.subscriptions.list({
        part: ['snippet', 'subscriberSnippet'],
        mySubscribers: true,
        maxResults,
        pageToken,
      });

      const data = response.data;
      const rawItems = data.items || [];
      const nextPageToken = data.nextPageToken || null;
      const totalResults = data.pageInfo?.totalResults || rawItems.length;

      // Extract subscriber channel IDs
      const basicItems: FetchedSubscriberItem[] = [];
      const channelIds: string[] = [];

      for (const item of rawItems) {
        const subSnippet: any = (item as any).subscriberSnippet || item.snippet || {};
        const channelId = subSnippet.channelId || item.snippet?.channelId || item.snippet?.resourceId?.channelId;

        if (channelId) {
          channelIds.push(channelId);
          basicItems.push({
            youtubeChannelId: channelId,
            title: (item as any).subscriberSnippet?.title || 'Canal do YouTube',
            description: subSnippet.description || '',
            thumbnailUrl: subSnippet.thumbnails?.default?.url || item.snippet?.thumbnails?.default?.url || null,
          });
        }
      }

      // If we have channel IDs, query youtube.channels.list in batch to get statistics, official title & handle
      if (channelIds.length > 0) {
        try {
          const detailsMap = await this.fetchChannelsDetailsBatch(accessToken, channelIds);
          for (const basic of basicItems) {
            const detail = detailsMap.get(basic.youtubeChannelId);
            if (detail) {
              if (detail.title) {
                basic.title = detail.title;
              }
              if (detail.description) {
                basic.description = detail.description;
              }
              basic.customUrl = detail.customUrl;
              basic.subscriberCount = detail.subscriberCount;
              basic.videoCount = detail.videoCount;
              if (detail.thumbnailUrl) {
                basic.thumbnailUrl = detail.thumbnailUrl;
              }
            }
          }
        } catch (detailErr: any) {
          this.logger.warn(`Não foi possível carregar estatísticas complementares: ${detailErr.message}`);
        }
      }

      return {
        items: basicItems,
        nextPageToken,
        totalResults,
      };
    } catch (err: any) {
      if (err?.code === 403 && err?.message?.includes('quota')) {
        this.logger.error('Limite de quota da YouTube Data API excedido.');
        throw new Error('Limite diário de quota da API do YouTube atingido.');
      }
      this.logger.error(`Erro ao consultar inscritos na YouTube API: ${err.message}`);
      throw err;
    }
  }

  /**
   * Queries multiple channels in a single request (up to 50 channels per call = 1 quota unit)
   */
  async fetchChannelsDetailsBatch(
    accessToken: string,
    channelIds: string[],
  ): Promise<Map<string, Partial<FetchedSubscriberItem>>> {
    const youtube = this.getYouTubeClient(accessToken);
    const map = new Map<string, Partial<FetchedSubscriberItem>>();

    const chunks: string[][] = [];
    for (let i = 0; i < channelIds.length; i += 50) {
      chunks.push(channelIds.slice(i, i + 50));
    }

    for (const chunk of chunks) {
      const res = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: chunk,
      });

      const items = res.data.items || [];
      for (const ch of items) {
        if (ch.id) {
          map.set(ch.id, {
            title: ch.snippet?.title || undefined,
            description: ch.snippet?.description || undefined,
            customUrl: ch.snippet?.customUrl || undefined,
            thumbnailUrl: ch.snippet?.thumbnails?.default?.url || undefined,
            subscriberCount: ch.statistics?.subscriberCount
              ? parseInt(ch.statistics.subscriberCount, 10)
              : undefined,
            videoCount: ch.statistics?.videoCount
              ? parseInt(ch.statistics.videoCount, 10)
              : undefined,
          });
        }
      }
    }

    return map;
  }

  /**
   * Fetches single channel details from YouTube Data API
   */
  async fetchChannelDetails(accessToken: string, youtubeChannelId: string) {
    const detailsMap = await this.fetchChannelsDetailsBatch(accessToken, [youtubeChannelId]);
    return detailsMap.get(youtubeChannelId) || null;
  }

  /**
   * Mock latest video generator for development or demonstration
   */
  getMockLatestVideo(youtubeChannelId: string): FetchedVideoItem {
    const mockVideosByChannel: Record<string, Partial<FetchedVideoItem>> = {
      UC_DEV_TECH_001: {
        youtubeVideoId: 'yt_vid_tech_001',
        title: 'Como Escalar Aplicações Node.js e NestJS em 2026',
        description: 'Aprenda padrões arquiteturais para microsserviços e alta resiliência.',
        url: 'https://www.youtube.com/watch?v=yt_vid_tech_001',
        viewCount: 15400,
        likeCount: 1120,
      },
      UC_DEV_CODE_002: {
        youtubeVideoId: 'yt_vid_code_002',
        title: 'Mastering TypeScript: Novidades e Tipagem Avançada',
        description: 'Técnicas essenciais de decorators, generics e types compartilhados.',
        url: 'https://www.youtube.com/watch?v=yt_vid_code_002',
        viewCount: 8900,
        likeCount: 740,
      },
      UC_DEV_DEV_003: {
        youtubeVideoId: 'yt_vid_devops_003',
        title: 'Deploy Contínuo sem Downtime com Docker e Traefik',
        description: 'Guia completo de pipelines CI/CD e monitoramento em produção.',
        url: 'https://www.youtube.com/watch?v=yt_vid_devops_003',
        viewCount: 6200,
        likeCount: 430,
      },
      UC_DEV_DESIGN_004: {
        youtubeVideoId: 'yt_vid_design_004',
        title: 'Construindo Interfaces Impressionantes com Tailwind CSS e Vue 3',
        description: 'Design moderno, microinterações e glassmorphism elegante.',
        url: 'https://www.youtube.com/watch?v=yt_vid_design_004',
        viewCount: 21300,
        likeCount: 1950,
      },
      UC_DEV_AI_005: {
        youtubeVideoId: 'yt_vid_ai_005',
        title: 'Desenvolvimento com Agentes de IA: Guia Prático para Programadores',
        description: 'Como integrar agentes autônomos e LLMs ao seu fluxo de trabalho diário.',
        url: 'https://www.youtube.com/watch?v=yt_vid_ai_005',
        viewCount: 34500,
        likeCount: 2800,
      },
      UC_DEV_DATA_006: {
        youtubeVideoId: 'yt_vid_data_006',
        title: 'Otimização Extrema de Consultas SQL e Prisma ORM',
        description: 'Estratégias de índices, cache e arquitetura de dados eficiente.',
        url: 'https://www.youtube.com/watch?v=yt_vid_data_006',
        viewCount: 11700,
        likeCount: 890,
      },
    };

    const specific = mockVideosByChannel[youtubeChannelId];
    const videoId = specific?.youtubeVideoId || `yt_vid_${youtubeChannelId.substring(0, 10)}`;

    return {
      youtubeVideoId: videoId,
      title: specific?.title || `Novo Vídeo Público do Canal ${youtubeChannelId}`,
      description: specific?.description || 'Conteúdo recentemente publicado no canal.',
      url: specific?.url || `https://www.youtube.com/watch?v=${videoId}`,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&h=360&fit=crop',
      viewCount: specific?.viewCount || 5000,
      likeCount: specific?.likeCount || 350,
      commentCount: 42,
    };
  }

  /**
   * Realistic mock subscriber generator for local development or demo sessions
   */
  getMockSubscribers(): FetchedSubscriberItem[] {
    return [
      {
        youtubeChannelId: 'UC_DEV_TECH_001',
        title: 'Tech Insights Brasil',
        customUrl: '@techinsightsbr',
        description: 'Tutoriais de desenvolvimento de software, arquitetura web e nuvem.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        subscriberCount: 24500,
        videoCount: 142,
      },
      {
        youtubeChannelId: 'UC_DEV_CODE_002',
        title: 'Código Eficiente',
        customUrl: '@codigoeficiente',
        description: 'Boas práticas em TypeScript, Node.js e ecossistema Vue.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        subscriberCount: 18200,
        videoCount: 88,
      },
      {
        youtubeChannelId: 'UC_DEV_DEV_003',
        title: 'DevOps & Cloud Lab',
        customUrl: '@devopscloudlab',
        description: 'Docker, Kubernetes e automações de infraestrutura.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        subscriberCount: 9400,
        videoCount: 45,
      },
      {
        youtubeChannelId: 'UC_DEV_DESIGN_004',
        title: 'UI & Frontend Moderno',
        customUrl: '@uifrontendbr',
        description: 'Design systems, Tailwind CSS e acessibilidade na web.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        subscriberCount: 31000,
        videoCount: 210,
      },
      {
        youtubeChannelId: 'UC_DEV_AI_005',
        title: 'Inteligência Artificial Aplicada',
        customUrl: '@ia_aplicada',
        description: 'Modelos de linguagem, automação agentic e computação de alta escala.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        subscriberCount: 52000,
        videoCount: 95,
      },
      {
        youtubeChannelId: 'UC_DEV_DATA_006',
        title: 'Engenharia de Dados Brasil',
        customUrl: '@dadosbrasil',
        description: 'Pipelines ETL, bancos relacionais e análise de performance.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
        subscriberCount: 12500,
        videoCount: 64,
      },
    ];
  }

  /**
   * Posts a top-level comment on a YouTube video via official YouTube Data API
   */
  /**
   * Translates YouTube Data API errors into short, user-friendly messages
   * and flags quota exhaustion so batch processing can stop early.
   */
  describeYouTubeError(err: any): { message: string; isQuota: boolean } {
    const status = err?.code || err?.response?.status;
    const reasons: string[] = (err?.errors || err?.response?.data?.error?.errors || [])
      .map((e: any) => String(e?.reason || ''))
      .filter(Boolean);
    const raw = String(err?.message || err || '');
    const has = (s: string) => reasons.includes(s) || raw.toLowerCase().includes(s.toLowerCase());

    if (has('quotaExceeded') || has('dailyLimitExceeded') || has('exceeded your quota') || has('quota')) {
      return { message: 'Quota diária da API do YouTube esgotada (renova à meia-noite, horário do Pacífico).', isQuota: true };
    }
    if (has('rateLimitExceeded') || has('userRateLimitExceeded') || status === 429) {
      return { message: 'Muitas requisições em pouco tempo (limite de taxa). Tente novamente em alguns minutos.', isQuota: false };
    }
    if (has('commentsDisabled')) {
      return { message: 'Comentários desativados pelo proprietário do vídeo.', isQuota: false };
    }
    if (has('videoNotFound') || status === 404) {
      return { message: 'Vídeo não encontrado ou removido.', isQuota: false };
    }
    if (status === 401 || has('invalid_grant') || has('Invalid Credentials')) {
      return { message: 'Sessão do Google expirada ou inválida. Reconecte o canal em Configurações.', isQuota: false };
    }
    if (has('insufficientPermissions') || has('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
      return { message: 'Permissão insuficiente no token do Google. Reconecte o canal autorizando todos os escopos.', isQuota: false };
    }
    if (has('forbidden') || status === 403) {
      return { message: `Ação recusada pelo YouTube (403): ${raw}`, isQuota: false };
    }
    return { message: raw || 'Erro desconhecido na API do YouTube.', isQuota: false };
  }

  private static readonly NO_TOKEN_ERROR =
    'Nenhum canal do Google autenticado (ou token expirado). Conecte/reconecte o canal em Configurações.';

  async postComment(
    accessToken: string | null | undefined,
    youtubeVideoId: string,
    commentText: string,
  ): Promise<{ commentId: string; error?: string; isQuota?: boolean }> {
    if (!accessToken) {
      return { commentId: '', error: YouTubeService.NO_TOKEN_ERROR };
    }
    if (accessToken.startsWith('mock-')) {
      this.logger.log(`[Simulação] Comentário postado com sucesso no vídeo ${youtubeVideoId}: "${commentText}"`);
      return { commentId: `mock_comment_${Date.now()}` };
    }

    try {
      const youtube = this.getYouTubeClient(accessToken);
      const res = await youtube.commentThreads.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId: youtubeVideoId,
            topLevelComment: {
              snippet: {
                textOriginal: commentText,
              },
            },
          },
        },
      });

      this.logger.log(`Comentário postado com sucesso no vídeo ${youtubeVideoId} (Comment ID: ${res.data.id})`);
      return { commentId: res.data.id || '' };
    } catch (err: any) {
      this.logger.error(`Erro ao postar comentário no vídeo ${youtubeVideoId}: ${err.message}`);
      const { message, isQuota } = this.describeYouTubeError(err);
      return { commentId: '', error: message, isQuota };
    }
  }

  /**
   * Rates a video as 'like' via official YouTube Data API
   */
  async likeVideo(
    accessToken: string | null | undefined,
    youtubeVideoId: string,
  ): Promise<{ success: boolean; error?: string; isQuota?: boolean }> {
    if (!accessToken) {
      return { success: false, error: YouTubeService.NO_TOKEN_ERROR };
    }
    if (accessToken.startsWith('mock-')) {
      this.logger.log(`[Simulação] Curtida (like) registrada com sucesso no vídeo ${youtubeVideoId}`);
      return { success: true };
    }

    try {
      const youtube = this.getYouTubeClient(accessToken);
      await youtube.videos.rate({
        id: youtubeVideoId,
        rating: 'like',
      });

      this.logger.log(`Curtida registrada com sucesso no vídeo ${youtubeVideoId}`);
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Erro ao curtir vídeo ${youtubeVideoId}: ${err.message}`);
      const { message, isQuota } = this.describeYouTubeError(err);
      return { success: false, error: message, isQuota };
    }
  }
}
