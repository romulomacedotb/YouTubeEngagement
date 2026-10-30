import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class ExecuteEngagementDto {
  @IsString()
  @IsNotEmpty()
  channelId!: string;

  @IsString()
  @IsOptional()
  videoId?: string;

  @IsString()
  @IsIn(['COMMENT', 'LIKE', 'PREPARE_COMMENT', 'OPEN_VIDEO'])
  type!: string;

  @IsString()
  @IsOptional()
  commentText?: string;

  @IsString()
  @IsOptional()
  @IsIn(['PREPARED', 'CONFIRMED', 'COPIED', 'EXECUTED', 'CANCELLED'])
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
