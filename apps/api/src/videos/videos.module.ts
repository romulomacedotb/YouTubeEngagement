import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { YouTubeModule } from '../youtube/youtube.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [YouTubeModule, AuthModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
