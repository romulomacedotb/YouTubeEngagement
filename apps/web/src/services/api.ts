import type {
  ApiResponse,
  HealthCheckResponse,
  PaginatedResponse,
  ChannelSummary,
  ChannelFilterParams,
  CommentTemplateDto,
  CreateCommentTemplateInput,
  UpdateCommentTemplateInput,
  SyncJobDto,
  EngagementPreviewRequest,
  EngagementPreviewResponse,
  EngagementActionDto,
  ExecuteEngagementInput,
  BatchEngagementInput,
  BatchEngagementResult,
  AuthChannelMeResponse,
  GoogleClientConfigDto,
  CreateGoogleClientConfigInput,
  UpdateGoogleClientConfigInput,
  GoogleAuthOptionsResponse
} from '@youtube-engagement/shared';

const BASE_URL = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.message || `Erro na requisição HTTP: ${response.status} ${response.statusText}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  const json: ApiResponse<T> = await response.json();
  return json.data;
}

export const apiService = {
  // Health
  getHealth: () => request<HealthCheckResponse>('/health'),

  // Channels & Subscribers
  getChannels: (params: ChannelFilterParams = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.hasLatestVideo !== undefined) query.append('hasLatestVideo', String(params.hasLatestVideo));
    if (params.engagementStatus) query.append('engagementStatus', params.engagementStatus);
    if (params.sortBy) query.append('sortBy', params.sortBy);
    if (params.sortOrder) query.append('sortOrder', params.sortOrder);
    const qs = query.toString();
    return request<PaginatedResponse<ChannelSummary>>(`/subscribers${qs ? `?${qs}` : ''}`);
  },

  getChannelById: (id: string) => request<ChannelSummary>(`/channels/${id}`),

  syncSubscribers: () => request<{ jobId: string; message: string }>('/sync/subscribers', {
    method: 'POST'
  }),

  syncSingleChannel: (id: string) => request<{ jobId: string; message: string }>(`/channels/${id}/sync`, {
    method: 'POST'
  }),

  // Templates
  getTemplates: () => request<CommentTemplateDto[]>('/comment-templates'),

  createTemplate: (data: CreateCommentTemplateInput) => request<CommentTemplateDto>('/comment-templates', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  updateTemplate: (id: string, data: UpdateCommentTemplateInput) => request<CommentTemplateDto>(`/comment-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),

  deleteTemplate: (id: string) => request<{ success: boolean }>(`/comment-templates/${id}`, {
    method: 'DELETE'
  }),

  // Engagement & Preview
  previewEngagement: (data: EngagementPreviewRequest) => request<EngagementPreviewResponse>('/engagement/preview', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  executeEngagement: (data: ExecuteEngagementInput) => request<{ success: boolean; actionId: string; isDuplicate?: boolean; message: string }>('/engagement/execute', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  executeBatchEngagement: (data: BatchEngagementInput) => request<BatchEngagementResult>('/engagement/batch', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getEngagementHistory: (params: { channelId?: string; status?: string; type?: string; page?: number; pageSize?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.channelId) query.append('channelId', params.channelId);
    if (params.status) query.append('status', params.status);
    if (params.type) query.append('type', params.type);
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    const qs = query.toString();
    return request<PaginatedResponse<EngagementActionDto>>(`/engagement/history${qs ? `?${qs}` : ''}`);
  },

  updateEngagementStatus: (id: string, status: string, notes?: string) => request<any>(`/engagement/actions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes })
  }),

  deleteEngagementAction: (id: string) => request<{ success: boolean; message: string }>(`/engagement/actions/${id}`, {
    method: 'DELETE'
  }),

  // Auth & Connected Channel
  getCurrentChannel: () => request<AuthChannelMeResponse>('/channel/me'),
  logout: () => request<{ success: boolean; message: string }>('/auth/logout', { method: 'POST' }),

  // Google OAuth Clients Configurations
  getGoogleClients: () => request<GoogleClientConfigDto[]>('/auth/google-clients'),
  getGoogleAuthOptions: () => request<GoogleAuthOptionsResponse>('/auth/google/options'),
  createGoogleClient: (data: CreateGoogleClientConfigInput) =>
    request<GoogleClientConfigDto>('/auth/google-clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateGoogleClient: (id: string, data: UpdateGoogleClientConfigInput) =>
    request<GoogleClientConfigDto>(`/auth/google-clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteGoogleClient: (id: string) =>
    request<{ success: boolean; message: string }>(`/auth/google-clients/${id}`, {
      method: 'DELETE',
    }),
  setDefaultGoogleClient: (id: string) =>
    request<GoogleClientConfigDto>(`/auth/google-clients/${id}/set-default`, {
      method: 'POST',
    }),

  // Videos
  syncAllLatestVideos: () => request<{ jobId: string; message: string }>('/videos/sync-latest', { method: 'POST' }),
  getLatestVideo: (channelId: string) => request<any>(`/channels/${channelId}/latest-video`),
  syncChannelVideo: (channelId: string) => request<any>(`/channels/${channelId}/sync-video`, { method: 'POST' }),

  // Jobs
  getJobStatus: (id: string) => request<SyncJobDto>(`/jobs/${id}`),
  getJobs: () => request<SyncJobDto[]>('/jobs')
};
