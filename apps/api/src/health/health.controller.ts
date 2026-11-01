import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { HealthService } from './health.service';
import { AuthService } from '../auth/auth.service';
import { HealthCheckResponse } from '@youtube-engagement/shared';

const SESSION_COOKIE_NAME = 'yt_session';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.check();
  }

  @Get('backup-db')
  async downloadDatabaseBackup(
    @Query('secret') querySecret: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    const account = await this.authService.getAccountFromSession(sessionCookie);

    const configuredSecret = process.env.BACKUP_SECRET?.trim();
    const providedSecret =
      (req.headers['x-backup-secret'] as string | undefined)?.trim() ||
      querySecret?.trim();
    const hasValidSecret =
      !!configuredSecret && !!providedSecret && configuredSecret === providedSecret;

    const isDev = process.env.NODE_ENV !== 'production';

    if (!account && !hasValidSecret && !isDev) {
      throw new UnauthorizedException(
        'Conecte-se ao seu canal (ou informe BACKUP_SECRET) para baixar o arquivo dev.db.',
      );
    }

    const snapshotPath = await this.healthService.createDatabaseSnapshot();

    res.setHeader('Cache-Control', 'no-store');
    return res.download(snapshotPath, 'dev.db', () => {
      fs.promises.unlink(snapshotPath).catch(() => {});
    });
  }
}
