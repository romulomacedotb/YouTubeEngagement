import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { EngagementService } from './engagement.service';
import { PreviewEngagementDto } from './dto/preview-engagement.dto';
import { ExecuteEngagementDto } from './dto/execute-engagement.dto';
import { BatchEngagementDto } from './dto/batch-engagement.dto';
import { Request } from 'express';

const SESSION_COOKIE_NAME = 'yt_session';

@Controller('engagement')
export class EngagementController {
  constructor(private readonly engagementService: EngagementService) {}

  @Post('preview')
  async preview(@Body() dto: PreviewEngagementDto) {
    return this.engagementService.preview(dto);
  }

  @Post('execute')
  async execute(@Body() dto: ExecuteEngagementDto) {
    return this.engagementService.execute(dto);
  }

  @Post('batch')
  async executeBatch(@Body() dto: BatchEngagementDto, @Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.engagementService.executeBatch(dto, sessionCookie);
  }

  @Get('history')
  async getHistory(
    @Query('channelId') channelId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.engagementService.getHistory({ channelId, status, type, page, pageSize });
  }

  @Get('actions/:id')
  async getActionById(@Param('id') id: string) {
    return this.engagementService.getActionById(id);
  }

  @Patch('actions/:id')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return this.engagementService.updateActionStatus(id, status, notes);
  }

  @Delete('actions/:id')
  async deleteAction(@Param('id') id: string) {
    return this.engagementService.deleteAction(id);
  }
}
