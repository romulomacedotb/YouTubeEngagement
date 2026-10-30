/**
 * Shared models and DTO interfaces for YouTube Engagement
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  database: 'connected' | 'disconnected';
  version: string;
}

export interface AuthUser {
  id: string;
  googleId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  channelId?: string;
  channelTitle?: string;
  channelThumbnail?: string;
}

export interface AuthChannelMeResponse {
  authenticated: boolean;
  channel?: {
    id: string;
    googleId: string;
    email?: string | null;
    name?: string | null;
    avatarUrl?: string | null;
    channelId?: string | null;
    channelTitle?: string | null;
    channelThumbnail?: string | null;
    clientConfigId?: string | null;
    clientConfigName?: string | null;
    createdAt?: string;
  };
  message?: string;
}

export interface ChannelSummary {
  id: string;
  youtubeChannelId: string;
  title: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  customUrl?: string | null;
  subscriberCount?: number | null;
  videoCount?: number | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  latestVideo?: VideoSummary | null;
  hasCommented?: boolean;
  hasLiked?: boolean;
  lastEngagementDate?: string | null;
  lastEngagementStatus?: string | null;
}

export interface VideoSummary {
  id: string;
  youtubeVideoId: string;
  channelId: string;
  title: string;
  url: string;
  publishedAt: string;
  checkedAt: string;
  thumbnailUrl?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  commentCount?: number | null;
}

export interface CommentTemplateDto {
  id: string;
  name: string;
  content: string;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentTemplateInput {
  name: string;
  content: string;
  category?: string;
  isActive?: boolean;
}

export interface UpdateCommentTemplateInput {
  name?: string;
  content?: string;
  category?: string;
  isActive?: boolean;
}

export type EngagementActionType = 'COMMENT' | 'LIKE' | 'COMMENT_AND_LIKE' | 'PREPARE_COMMENT' | 'OPEN_VIDEO';
export type EngagementActionStatus = 'PREPARED' | 'CONFIRMED' | 'EXECUTED' | 'FAILED' | 'CANCELLED' | 'COPIED';

export interface EngagementActionDto {
  id: string;
  channelId: string;
  channelTitle?: string;
  channelThumbnail?: string | null;
  videoId?: string | null;
  videoTitle?: string | null;
  videoUrl?: string | null;
  type: EngagementActionType;
  status: EngagementActionStatus;
  commentText?: string | null;
  notes?: string | null;
  confirmedAt?: string | null;
  executedAt?: string | null;
  error?: string | null;
  createdAt: string;
}

export interface ExecuteEngagementInput {
  channelId: string;
  videoId?: string;
  type?: EngagementActionType;
  status?: EngagementActionStatus;
  commentText?: string;
  notes?: string;
  idempotencyKey?: string;
}

export interface BatchEngagementInput {
  channelIds: string[];
  templateId?: string;
  commentText?: string;
  actionTypes: ('COMMENT' | 'LIKE')[];
  skipAlreadyInteracted?: boolean;
  variables?: Record<string, string>;
}

export interface BatchEngagementChannelResult {
  channelId: string;
  channelTitle: string;
  videoId?: string;
  videoTitle?: string;
  commentSent: boolean;
  liked: boolean;
  skipped: boolean;
  skipReason?: string;
  commentText?: string;
  error?: string;
}

export interface BatchEngagementResult {
  totalProcessed: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  results: BatchEngagementChannelResult[];
}

export interface EngagementPreviewRequest {
  channelId: string;
  videoId?: string;
  templateId?: string;
  customText?: string;
  variables?: Record<string, string>;
}

export interface EngagementPreviewResponse {
  channelTitle: string;
  videoTitle?: string;
  videoUrl?: string;
  renderedComment: string;
  availableVariables: Record<string, string>;
}

export type SyncJobType = 'SUBSCRIBERS' | 'CHANNEL_REFRESH' | 'LATEST_VIDEOS';
export type SyncJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface SyncJobDto {
  id: string;
  type: SyncJobType;
  status: SyncJobStatus;
  processedCount: number;
  errorCount: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

export interface ChannelFilterParams {
  search?: string;
  hasLatestVideo?: boolean;
  engagementStatus?: 'all' | 'pending' | 'commented' | 'liked' | 'both';
  page?: number;
  pageSize?: number;
  sortBy?: 'title' | 'lastSyncedAt' | 'createdAt' | 'subscriberCount' | 'videoCount';
  sortOrder?: 'asc' | 'desc';
}

export interface GoogleClientConfigDto {
  id: string;
  name: string;
  clientId: string;
  clientSecretMasked: string;
  redirectUri: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoogleClientConfigInput {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  isDefault?: boolean;
}

export interface UpdateGoogleClientConfigInput {
  name?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  isDefault?: boolean;
}

export interface GoogleAuthOptionsResponse {
  defaultConfigId: string | null;
  clients: Array<{
    id: string;
    name: string;
    clientId: string;
    redirectUri: string;
    isDefault: boolean;
  }>;
  hasEnvFallback: boolean;
}

