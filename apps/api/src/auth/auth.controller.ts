import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import {
  CreateGoogleClientConfigInput,
  UpdateGoogleClientConfigInput,
} from '@youtube-engagement/shared';

const SESSION_COOKIE_NAME = 'yt_session';
const STATE_COOKIE_NAME = 'oauth_state';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('auth/google')
  async googleAuth(
    @Query('clientConfigId') clientConfigId: string,
    @Res() res: Response,
  ) {
    const config = await this.authService.resolveClientConfig(clientConfigId);

    const activeClientId = config?.clientId || process.env.GOOGLE_CLIENT_ID || '';
    const isMockClient = !activeClientId || activeClientId.startsWith('mock-');

    if (isMockClient && process.env.NODE_ENV !== 'production') {
      this.logger.warn(
        'GOOGLE_CLIENT_ID não configurado com credenciais reais do Google Cloud. Utilizando Canal de Demonstração (dev-login) para evitar erro 401: invalid_client.',
      );
      return res.redirect('/api/auth/dev-login');
    }

    const { url, state } = await this.authService.generateOAuthUrl(config?.id);
    const isProduction = process.env.NODE_ENV === 'production';

    // Store state in httpOnly cookie to prevent CSRF
    res.cookie(STATE_COOKIE_NAME, state, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
      path: '/api/auth',
    });

    return res.redirect(url);
  }

  @Get('auth/google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieState = req.cookies?.[STATE_COOKIE_NAME];

    try {
      const { sessionToken } = await this.authService.handleCallback(
        code,
        state,
        cookieState,
      );

      // Set secure session cookie
      res.cookie(SESSION_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      // Clear state cookie
      res.clearCookie(STATE_COOKIE_NAME, { path: '/api/auth' });

      return res.redirect(`${webOrigin}/settings?oauth=success`);
    } catch (err: any) {
      this.logger.error(`OAuth callback falhou: ${err.message}`);
      return res.redirect(
        `${webOrigin}/settings?oauth=error&message=${encodeURIComponent(
          err.message || 'Erro na autenticação',
        )}`,
      );
    }
  }

  @Get('auth/google/options')
  async getGoogleAuthOptions() {
    return this.authService.getAuthOptions();
  }

  @Get('auth/google-clients')
  async listGoogleClients() {
    return this.authService.listClientConfigs();
  }

  @Post('auth/google-clients')
  async createGoogleClient(@Body() input: CreateGoogleClientConfigInput) {
    return this.authService.createClientConfig(input);
  }

  @Patch('auth/google-clients/:id')
  async updateGoogleClient(
    @Param('id') id: string,
    @Body() input: UpdateGoogleClientConfigInput,
  ) {
    return this.authService.updateClientConfig(id, input);
  }

  @Delete('auth/google-clients/:id')
  async deleteGoogleClient(@Param('id') id: string) {
    return this.authService.deleteClientConfig(id);
  }

  @Post('auth/google-clients/:id/set-default')
  async setDefaultGoogleClient(@Param('id') id: string) {
    return this.authService.setDefaultClientConfig(id);
  }

  @Post('auth/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    await this.authService.logout(sessionCookie);

    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return { success: true, message: 'Sessão encerrada com sucesso.' };
  }

  @Get('channel/me')
  async getChannelMe(@Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.authService.getCurrentChannel(sessionCookie);
  }

  /**
   * Endpoint for testing and development mock login (disabled in production)
   */
  @Get('auth/dev-login')
  async devLogin(@Res() res: Response) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Indisponível em ambiente de produção.' });
    }

    const { sessionToken } = await this.authService.createDevSession();
    const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173';

    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.redirect(`${webOrigin}/settings?oauth=dev_success`);
  }
}
