import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class CommentTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.commentTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.commentTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Modelo com ID ${id} não encontrado.`);
    }
    return template;
  }

  async create(dto: CreateTemplateDto) {
    return this.prisma.commentTemplate.create({
      data: {
        name: dto.name,
        content: dto.content,
        category: dto.category || 'Geral',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    return this.prisma.commentTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.commentTemplate.delete({
      where: { id },
    });
    return { success: true, message: 'Modelo excluído com sucesso.' };
  }
}
