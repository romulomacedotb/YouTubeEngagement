import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { YouTubeModule } from '../youtube/youtube.module';
import { AuthModule } from '../auth/auth.module';
import { VideosModule } from '../videos/videos.module';

@Module({
  imports: [YouTubeModule, AuthModule, VideosModule],
  controllers: [ChannelsController],
  providers: [ChannelsService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
