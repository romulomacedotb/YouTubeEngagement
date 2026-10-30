import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { Request } from 'express';

const SESSION_COOKIE_NAME = 'yt_session';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':id')
  async getChannel(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Post(':id/sync')
  async syncChannel(@Param('id') id: string, @Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.channelsService.syncSingleChannel(id, sessionCookie);
  }

  @Get(':id/latest-video')
  async getLatestVideo(@Param('id') id: string, @Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.channelsService.getLatestVideo(id, sessionCookie);
  }

  @Post(':id/sync-video')
  async forceSyncLatestVideo(@Param('id') id: string, @Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.channelsService.forceSyncLatestVideo(id, sessionCookie);
  }
}
