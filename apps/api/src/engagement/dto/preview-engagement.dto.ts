import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class PreviewEngagementDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @IsOptional()
  videoId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  customText?: string;

  @IsObject()
  @IsOptional()
  variables?: Record<string, string>;
}
