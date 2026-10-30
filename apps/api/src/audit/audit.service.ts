import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async logAction(action: string, entity?: string, entityId?: string, details?: string) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId,
        details,
      },
    });
  }
}
