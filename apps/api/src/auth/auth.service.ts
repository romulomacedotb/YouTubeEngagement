import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { google } from 'googleapis';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import {
  AuthChannelMeResponse,
  GoogleClientConfigDto,
  CreateGoogleClientConfigInput,
  UpdateGoogleClientConfigInput,
  GoogleAuthOptionsResponse,
} from '@youtube-engagement/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resolves a client config either by ID, or by default flag, or returns null (falling back to .env)
   */
  async resolveClientConfig(clientConfigId?: string) {
    if (clientConfigId) {
      const config = await this.prisma.googleClientConfig.findUnique({
        where: { id: clientConfigId },
      });
      if (config) return config;
    }

    // Fallback to default registered config in database
    const defaultConfig = await this.prisma.googleClientConfig.findFirst({
      where: { isDefault: true },
    });

    return defaultConfig || null;
  }

  /**
   * Resolves effective OAuth redirect URI, automatically upgrading localhost URIs
   * when running in production behind a public URL (e.g. Render / Koyeb).
   */
  private resolveEffectiveRedirectUri(configuredUri?: string): string {
    const publicBase = (
      process.env.PUBLIC_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      process.env.WEB_ORIGIN ||
      ''
    ).replace(/\/$/, '');

    const envRedirect =
      process.env.GOOGLE_REDIRECT_URI?.trim() ||
      (publicBase && !publicBase.includes('localhost')
        ? `${publicBase}/api/auth/google/callback`
        : '');

    const raw = configuredUri?.trim() || '';
    const isLocalUri = raw.includes('localhost') || raw.includes('127.0.0.1');

    if (process.env.NODE_ENV === 'production' && envRedirect && (!raw || isLocalUri)) {
      return envRedirect;
    }

    return raw || envRedirect || 'http://localhost:3000/api/auth/google/callback';
  }

  /**
   * Instantiates Google OAuth2 client with either database credentials or .env fallback
   */
  getOAuthClient(config?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } | null) {
    if (config) {
      let clientSecret = config.clientSecret;
      try {
        clientSecret = this.crypto.decrypt(config.clientSecret);
      } catch {
        // Plaintext fallback (if unencrypted)
        clientSecret = config.clientSecret;
      }

      const redirectUri = this.resolveEffectiveRedirectUri(config.redirectUri);

      return new google.auth.OAuth2(config.clientId, clientSecret, redirectUri);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = this.resolveEffectiveRedirectUri();

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generates Google OAuth consent URL and CSRF state token.
   * State contains both the CSRF random token and optionally the clientConfigId.
   */
  async generateOAuthUrl(clientConfigId?: string): Promise<{ url: string; state: string; configId: string | null }> {
    const config = await this.resolveClientConfig(clientConfigId);
    const oauth2Client = this.getOAuthClient(config);
    const csrfToken = this.crypto.generateRandomToken(24);

    const configId = config?.id || null;
    const state = configId ? `${csrfToken}:${configId}` : csrfToken;

    const scopes = [
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
      include_granted_scopes: true,
    });

    return { url, state, configId };
  }

  /**
   * Exchanges authorization code for tokens, verifies state, and stores encrypted credentials.
   */
  async handleCallback(code: string, state: string, cookieState?: string) {
    if (!state || !cookieState || state !== cookieState) {
      this.logger.warn('Tentativa de login rejeitada: State de autenticação inválido ou ausente (CSRF check).');
      throw new UnauthorizedException('Falha de segurança: State de autenticação inválido (CSRF).');
    }

    if (!code) {
      throw new BadRequestException('Código de autorização não informado pelo Google.');
    }

    // Extract clientConfigId if present in state
    let configId: string | null = null;
    if (state.includes(':')) {
      const parts = state.split(':');
      if (parts.length >= 2 && parts[1]) {
        configId = parts[1];
      }
    }

    let config: any = null;
    if (configId) {
      config = await this.prisma.googleClientConfig.findUnique({
        where: { id: configId },
      });
    }

    try {
      const oauth2Client = this.getOAuthClient(config);
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // 1. Fetch Google User Profile
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get().catch(() => null);

      // 2. Fetch authenticated YouTube Channel details
      const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
      const channelsRes = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
      });

      const primaryChannel = channelsRes.data.items?.[0];
      const channelId = primaryChannel?.id || userInfo?.data?.id || 'unknown-channel';
      const channelTitle = primaryChannel?.snippet?.title || userInfo?.data?.name || 'Canal do YouTube';
      const channelThumbnail =
        primaryChannel?.snippet?.thumbnails?.default?.url || userInfo?.data?.picture || null;
      const googleId = userInfo?.data?.id || channelId;

      // 3. Encrypt sensitive tokens before storing in database
      const encryptedAccessToken = tokens.access_token
        ? this.crypto.encrypt(tokens.access_token)
        : null;
      const encryptedRefreshToken = tokens.refresh_token
        ? this.crypto.encrypt(tokens.refresh_token)
        : null;

      const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

      // 4. Upsert OAuthAccount in SQLite
      const account = await this.prisma.oAuthAccount.upsert({
        where: { googleId },
        update: {
          email: userInfo?.data?.email || null,
          name: userInfo?.data?.name || channelTitle,
          avatarUrl: userInfo?.data?.picture || null,
          channelId,
          channelTitle,
          channelThumbnail,
          encryptedAccessToken,
          ...(encryptedRefreshToken ? { encryptedRefreshToken } : {}),
          tokenExpiresAt,
          scope: tokens.scope || null,
          clientConfigId: config?.id || null,
        },
        create: {
          googleId,
          email: userInfo?.data?.email || null,
          name: userInfo?.data?.name || channelTitle,
          avatarUrl: userInfo?.data?.picture || null,
          channelId,
          channelTitle,
          channelThumbnail,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt,
          scope: tokens.scope || null,
          clientConfigId: config?.id || null,
        },
      });

      // 5. Create session cookie value
      const sessionToken = this.createSessionToken(account.id);
      this.logger.log(
        `Canal conectado com sucesso: "${channelTitle}" (${channelId}) via credencial: ${config?.name || 'Padrão .env'}`,
      );

      return { account, sessionToken };
    } catch (err: any) {
      this.logger.error(`Erro ao processar callback do Google OAuth: ${err.message}`, err.stack);
      throw new BadRequestException(`Falha ao autenticar com o Google: ${err.message}`);
    }
  }

  /**
   * Helper to sign session cookies: accountId.hmacSignature
   */
  createSessionToken(accountId: string): string {
    const signature = this.crypto.sign(accountId);
    return `${accountId}.${signature}`;
  }

  /**
   * Validates session cookie and retrieves the authenticated account
   */
  async getAccountFromSession(sessionCookie?: string) {
    if (!sessionCookie) return null;

    const parts = sessionCookie.split('.');
    if (parts.length !== 2) return null;

    const [accountId, signature] = parts;
    const isValid = this.crypto.verify(accountId, signature);
    if (!isValid) {
      this.logger.warn('Assinatura do cookie de sessão inválida.');
      return null;
    }

    const account = await this.prisma.oAuthAccount.findUnique({
      where: { id: accountId },
      include: { clientConfig: true },
    });

    return account;
  }

  /**
   * Returns authenticated channel status without leaking any token secrets
   */
  async getCurrentChannel(sessionCookie?: string): Promise<AuthChannelMeResponse> {
    const account = await this.getAccountFromSession(sessionCookie);

    if (!account) {
      return {
        authenticated: false,
        message: 'Nenhum canal autenticado no momento.',
      };
    }

    return {
      authenticated: true,
      channel: {
        id: account.id,
        googleId: account.googleId,
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
        channelId: account.channelId,
        channelTitle: account.channelTitle,
        channelThumbnail: account.channelThumbnail,
        clientConfigId: account.clientConfigId,
        clientConfigName: account.clientConfig?.name || null,
        createdAt: account.createdAt.toISOString(),
      },
    };
  }

  /**
   * Refreshes OAuth token if expired or near expiry, returning decrypted active access token
   */
  async getValidAccessToken(accountId: string): Promise<string | null> {
    const account = await this.prisma.oAuthAccount.findUnique({
      where: { id: accountId },
      include: { clientConfig: true },
    });

    if (!account || !account.encryptedAccessToken) {
      return null;
    }

    const now = Date.now();
    const expiresAt = account.tokenExpiresAt ? account.tokenExpiresAt.getTime() : 0;
    const isNearExpiry = expiresAt - now < 5 * 60 * 1000; // less than 5 min

    if (!isNearExpiry && expiresAt > now) {
      return this.crypto.decrypt(account.encryptedAccessToken);
    }

    if (!account.encryptedRefreshToken) {
      this.logger.warn(`Token expirado para ${account.channelTitle} sem refresh token.`);
      return this.crypto.decrypt(account.encryptedAccessToken);
    }

    try {
      this.logger.log(`Renovando access token para o canal ${account.channelTitle}...`);
      const refreshToken = this.crypto.decrypt(account.encryptedRefreshToken);
      const oauth2Client = this.getOAuthClient(account.clientConfig);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      const refreshRes = await oauth2Client.refreshAccessToken();
      const newTokens = refreshRes.credentials;

      const newEncryptedAccessToken = newTokens.access_token
        ? this.crypto.encrypt(newTokens.access_token)
        : account.encryptedAccessToken;

      const newExpiresAt = newTokens.expiry_date ? new Date(newTokens.expiry_date) : null;

      await this.prisma.oAuthAccount.update({
        where: { id: account.id },
        data: {
          encryptedAccessToken: newEncryptedAccessToken,
          tokenExpiresAt: newExpiresAt,
        },
      });

      return newTokens.access_token || null;
    } catch (err: any) {
      this.logger.error(`Falha ao renovar token OAuth: ${err.message}`);
      return null;
    }
  }

  /**
   * Masks a client secret for secure UI display
   */
  private maskSecret(secret: string): string {
    try {
      const decrypted = this.crypto.decrypt(secret);
      if (!decrypted || decrypted.length <= 8) return '••••••••';
      return `${decrypted.slice(0, 4)}••••••••${decrypted.slice(-4)}`;
    } catch {
      if (!secret || secret.length <= 8) return '••••••••';
      return `${secret.slice(0, 4)}••••••••${secret.slice(-4)}`;
    }
  }

  /**
   * Lists all registered Google Client configurations
   */
  async listClientConfigs(): Promise<GoogleClientConfigDto[]> {
    const configs = await this.prisma.googleClientConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return configs.map((c) => ({
      id: c.id,
      name: c.name,
      clientId: c.clientId,
      clientSecretMasked: this.maskSecret(c.clientSecret),
      redirectUri: c.redirectUri,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Returns available options for connecting a channel
   */
  async getAuthOptions(): Promise<GoogleAuthOptionsResponse> {
    const configs = await this.prisma.googleClientConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    const defaultConfig = configs.find((c) => c.isDefault);
    const hasEnvFallback =
      !!process.env.GOOGLE_CLIENT_ID &&
      !process.env.GOOGLE_CLIENT_ID.startsWith('mock-');

    return {
      defaultConfigId: defaultConfig ? defaultConfig.id : null,
      clients: configs.map((c) => ({
        id: c.id,
        name: c.name,
        clientId: c.clientId,
        redirectUri: c.redirectUri,
        isDefault: c.isDefault,
      })),
      hasEnvFallback,
    };
  }

  /**
   * Creates a new Google Client configuration
   */
  async createClientConfig(input: CreateGoogleClientConfigInput): Promise<GoogleClientConfigDto> {
    if (!input.name?.trim()) throw new BadRequestException('Nome da credencial é obrigatório.');
    if (!input.clientId?.trim()) throw new BadRequestException('Client ID do Google é obrigatório.');
    if (!input.clientSecret?.trim()) throw new BadRequestException('Client Secret do Google é obrigatório.');

    const redirectUri = this.resolveEffectiveRedirectUri(input.redirectUri);

    // If marked as default, unset previous default
    if (input.isDefault) {
      await this.prisma.googleClientConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const encryptedSecret = this.crypto.encrypt(input.clientSecret.trim());

    const created = await this.prisma.googleClientConfig.create({
      data: {
        name: input.name.trim(),
        clientId: input.clientId.trim(),
        clientSecret: encryptedSecret,
        redirectUri,
        isDefault: !!input.isDefault,
      },
    });

    return {
      id: created.id,
      name: created.name,
      clientId: created.clientId,
      clientSecretMasked: this.maskSecret(created.clientSecret),
      redirectUri: created.redirectUri,
      isDefault: created.isDefault,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Updates an existing Google Client configuration
   */
  async updateClientConfig(id: string, input: UpdateGoogleClientConfigInput): Promise<GoogleClientConfigDto> {
    const existing = await this.prisma.googleClientConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Credencial não encontrada.');

    if (input.isDefault) {
      await this.prisma.googleClientConfig.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const dataToUpdate: any = {};
    if (input.name !== undefined) dataToUpdate.name = input.name.trim();
    if (input.clientId !== undefined) dataToUpdate.clientId = input.clientId.trim();
    if (input.redirectUri !== undefined) dataToUpdate.redirectUri = input.redirectUri.trim();
    if (input.isDefault !== undefined) dataToUpdate.isDefault = !!input.isDefault;

    if (input.clientSecret && input.clientSecret.trim()) {
      dataToUpdate.clientSecret = this.crypto.encrypt(input.clientSecret.trim());
    }

    const updated = await this.prisma.googleClientConfig.update({
      where: { id },
      data: dataToUpdate,
    });

    return {
      id: updated.id,
      name: updated.name,
      clientId: updated.clientId,
      clientSecretMasked: this.maskSecret(updated.clientSecret),
      redirectUri: updated.redirectUri,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Deletes a Google Client configuration
   */
  async deleteClientConfig(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.googleClientConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Credencial não encontrada.');

    await this.prisma.googleClientConfig.delete({ where: { id } });
    return { success: true, message: 'Credencial excluída com sucesso.' };
  }

  /**
   * Sets a Google Client configuration as default
   */
  async setDefaultClientConfig(id: string): Promise<GoogleClientConfigDto> {
    const existing = await this.prisma.googleClientConfig.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Credencial não encontrada.');

    await this.prisma.googleClientConfig.updateMany({
      where: { id: { not: id }, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.googleClientConfig.update({
      where: { id },
      data: { isDefault: true },
    });

    return {
      id: updated.id,
      name: updated.name,
      clientId: updated.clientId,
      clientSecretMasked: this.maskSecret(updated.clientSecret),
      redirectUri: updated.redirectUri,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Development login mode for local tests without requiring live Google OAuth credentials
   */
  async createDevSession() {
    const devGoogleId = 'dev-demo-google-id-001';
    const account = await this.prisma.oAuthAccount.upsert({
      where: { googleId: devGoogleId },
      update: {
        channelTitle: 'Canal de Demonstração (Dev)',
        channelId: 'UC_DEMO_CANAL_001',
        channelThumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop',
        email: 'dev@youtube-engagement.local',
        name: 'Desenvolvedor YouTube Engagement',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      },
      create: {
        googleId: devGoogleId,
        channelTitle: 'Canal de Demonstração (Dev)',
        channelId: 'UC_DEMO_CANAL_001',
        channelThumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&h=128&fit=crop',
        email: 'dev@youtube-engagement.local',
        name: 'Desenvolvedor YouTube Engagement',
        encryptedAccessToken: this.crypto.encrypt('mock-access-token-dev'),
        encryptedRefreshToken: this.crypto.encrypt('mock-refresh-token-dev'),
        tokenExpiresAt: new Date(Date.now() + 3600000),
        scope: 'https://www.googleapis.com/auth/youtube.readonly',
      },
    });

    const sessionToken = this.createSessionToken(account.id);
    return { account, sessionToken };
  }

  /**
   * Log out session
   */
  async logout(sessionCookie?: string) {
    const account = await this.getAccountFromSession(sessionCookie);
    if (account) {
      this.logger.log(`Sessão encerrada para o canal: ${account.channelTitle}`);
    }
    return { success: true, message: 'Sessão encerrada com sucesso.' };
  }
}
