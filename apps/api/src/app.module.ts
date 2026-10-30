import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { YouTubeModule } from './youtube/youtube.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { ChannelsModule } from './channels/channels.module';
import { VideosModule } from './videos/videos.module';
import { CommentTemplatesModule } from './comment-templates/comment-templates.module';
import { EngagementModule } from './engagement/engagement.module';
import { JobsModule } from './jobs/jobs.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    YouTubeModule,
    SubscribersModule,
    ChannelsModule,
    VideosModule,
    CommentTemplatesModule,
    EngagementModule,
    JobsModule,
    AuditModule,
  ],
})
export class AppModule {}
