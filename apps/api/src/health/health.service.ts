import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { HealthCheckResponse } from '@youtube-engagement/shared';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResponse> {
    let dbStatus: 'connected' | 'disconnected' = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'disconnected';
    }

    return {
      status: dbStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      version: '1.0.0',
    };
  }

  /**
   * Generates a consistent, single-file hot snapshot of SQLite (dev.db) using VACUUM INTO
   */
  async createDatabaseSnapshot(): Promise<string> {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const snapshotPath = path.join(os.tmpdir(), `dev-snapshot-${uniqueSuffix}.db`);
    const sqliteSafePath = snapshotPath.replace(/\\/g, '/').replace(/'/g, "''");

    try {
      await this.prisma.$executeRawUnsafe(`VACUUM INTO '${sqliteSafePath}'`);
      return snapshotPath;
    } catch (err: any) {
      this.logger.error(`Falha ao gerar snapshot do SQLite: ${err.message}`);
      throw new InternalServerErrorException('Não foi possível gerar o backup do arquivo dev.db.');
    }
  }
}
