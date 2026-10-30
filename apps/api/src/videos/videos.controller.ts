import { Controller, Get, Post, Param, Req } from '@nestjs/common';
import { VideosService } from './videos.service';
import { Request } from 'express';

const SESSION_COOKIE_NAME = 'yt_session';

@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get(':id')
  async getVideo(@Param('id') id: string) {
    return this.videosService.findOne(id);
  }

  @Post('sync-latest')
  async syncLatestVideos(@Req() req: Request) {
    const sessionCookie = req.cookies?.[SESSION_COOKIE_NAME];
    return this.videosService.syncLatestVideosForAllChannels(sessionCookie);
  }
}
