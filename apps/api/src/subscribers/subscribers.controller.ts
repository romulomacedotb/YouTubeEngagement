import { Controller, Get, Post, Query, Req } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { ChannelFilterParams, PaginatedResponse, ChannelSummary } from '@youtube-engagement/shared';
import { Request } from 'express';

const SESSION_COOKIE_NAME = 'yt_session';

@Controller()
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Get('subscribers')
  async listSubscribers(
    @Query() query: ChannelFilterParams,
  ): Promise<PaginatedResponse<ChannelSummary>> {
    return this.subscribersService.listSubscribers(query);
  }

  @Post('sync/subscribers')
  async startSync(@Req() req: Request): Promise<{ jobId: string; message: string }> {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.subscribersService.startSync(sessionCookie);
  }
}
