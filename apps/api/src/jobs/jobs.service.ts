import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.syncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.syncJob.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundException(`Tarefa com ID ${id} não encontrada.`);
    }
    return job;
  }
}
