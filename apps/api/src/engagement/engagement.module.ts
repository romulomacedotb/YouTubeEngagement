import { Module } from '@nestjs/common';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
import { YouTubeModule } from '../youtube/youtube.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [YouTubeModule, AuthModule],
  controllers: [EngagementController],
  providers: [EngagementService],
  exports: [EngagementService],
})
export class EngagementModule {}

