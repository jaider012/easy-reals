import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class VideoSeriesDto {
  @ApiProperty({ description: 'Series ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Series name' })
  @Expose()
  name: string;
}

export class VideoSocialPostDto {
  @ApiProperty({ description: 'Post ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Platform name' })
  @Expose()
  platform: string;

  @ApiProperty({ description: 'Post status' })
  @Expose()
  status: string;

  @ApiPropertyOptional({ description: 'Scheduled publish time' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Actual publish time' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'View count on this platform' })
  @Expose()
  viewsCount?: number;

  @ApiPropertyOptional({ description: 'Like count on this platform' })
  @Expose()
  likesCount?: number;
}

export class VideoResponseDto {
  @ApiProperty({ description: 'Video ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Video title' })
  @Expose()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @Expose()
  description?: string;

  @ApiProperty({ description: 'Script content' })
  @Expose()
  script: string;

  @ApiPropertyOptional({ description: 'Tags associated with the video' })
  @Expose()
  tags?: string[];

  @ApiProperty({ description: 'Prompt used for generation' })
  @Expose()
  promptUsed: string;

  @ApiPropertyOptional({ description: 'Generation settings used' })
  @Expose()
  generationSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Video file URL' })
  @Expose()
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @Expose()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Video duration in seconds' })
  @Expose()
  duration?: number;

  @ApiPropertyOptional({ description: 'File size in MB' })
  @Expose()
  @Transform(({ value }) => value?.toString())
  fileSizeMb?: string;

  @ApiPropertyOptional({ description: 'Video resolution' })
  @Expose()
  resolution?: string;

  @ApiPropertyOptional({ description: 'AI model used for generation' })
  @Expose()
  aiModelUsed?: string;

  @ApiPropertyOptional({ description: 'Generation cost in USD' })
  @Expose()
  @Transform(({ value }) => value?.toString())
  generationCost?: string;

  @ApiPropertyOptional({ description: 'Time taken for generation in seconds' })
  @Expose()
  generationTimeSeconds?: number;

  @ApiProperty({ description: 'Current status of the video' })
  @Expose()
  status: string;

  @ApiProperty({ description: 'Generation progress percentage' })
  @Expose()
  generationProgress: number;

  @ApiPropertyOptional({ description: 'Error message if generation failed' })
  @Expose()
  errorMessage?: string;

  @ApiPropertyOptional({ description: 'Quality score (0-10)' })
  @Expose()
  @Transform(({ value }) => value?.toString())
  qualityScore?: string;

  @ApiPropertyOptional({ description: 'Content safety score (0-10)' })
  @Expose()
  @Transform(({ value }) => value?.toString())
  contentSafetyScore?: string;

  @ApiProperty({ description: 'Video creation timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: string;

  @ApiProperty({ description: 'Video last update timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: string;

  @ApiProperty({ description: 'Series this video belongs to' })
  @Expose()
  @Type(() => VideoSeriesDto)
  series: VideoSeriesDto;

  @ApiPropertyOptional({ description: 'Social media posts for this video' })
  @Expose()
  @Type(() => VideoSocialPostDto)
  socialPosts?: VideoSocialPostDto[];
}
