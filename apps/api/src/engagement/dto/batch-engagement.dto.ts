import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import type { BatchEngagementInput } from '@youtube-engagement/shared';

export class BatchEngagementDto implements BatchEngagementInput {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  channelIds!: string[];

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  commentText?: string;

  @IsArray()
  actionTypes!: ('COMMENT' | 'LIKE')[];

  @IsBoolean()
  @IsOptional()
  skipAlreadyInteracted?: boolean;

  @IsOptional()
  variables?: Record<string, string>;
}
