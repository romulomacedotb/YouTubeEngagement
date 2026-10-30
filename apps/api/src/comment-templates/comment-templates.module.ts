import { Module } from '@nestjs/common';
import { CommentTemplatesController } from './comment-templates.controller';
import { CommentTemplatesService } from './comment-templates.service';

@Module({
  controllers: [CommentTemplatesController],
  providers: [CommentTemplatesService],
  exports: [CommentTemplatesService],
})
export class CommentTemplatesModule {}
