import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class SeriesStatsDto {
  @ApiProperty({ description: 'Total videos generated' })
  @Expose()
  totalVideosGenerated: number;

  @ApiProperty({ description: 'Total views across all videos' })
  @Expose()
  totalViews: number;

  @ApiProperty({ description: 'Total likes across all videos' })
  @Expose()
  totalLikes: number;

  @ApiPropertyOptional({ description: 'Average engagement rate' })
  @Expose()
  avgEngagementRate?: number;
}

export class SeriesTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Template name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: 'Template category' })
  @Expose()
  category?: {
    id: string;
    name: string;
  };
}

export class SeriesResponseDto {
  @ApiProperty({ description: 'Series ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Series name' })
  @Expose()
  name: string;

  @ApiPropertyOptional({ description: 'Series description' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: 'Custom prompt for content generation' })
  @Expose()
  customPrompt?: string;

  @ApiPropertyOptional({ description: 'Visual style settings' })
  @Expose()
  visualStyle?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Voice settings for narration' })
  @Expose()
  voiceSettings?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Music and audio settings' })
  @Expose()
  musicSettings?: Record<string, any>;

  @ApiProperty({ description: 'Whether series is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Posting frequency per week' })
  @Expose()
  postingFrequency: number;

  @ApiPropertyOptional({ description: 'Posting schedule configuration' })
  @Expose()
  postingSchedule?: Record<string, any>;

  @ApiProperty({ description: 'Video duration in seconds' })
  @Expose()
  videoDuration: number;

  @ApiPropertyOptional({ description: 'Content style preference' })
  @Expose()
  contentStyle?: string;

  @ApiProperty({
    description: 'Whether to use trending topics for content generation',
  })
  @Expose()
  useTrendingTopics: boolean;

  @ApiProperty({ description: 'Series creation timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: string;

  @ApiProperty({ description: 'Series last update timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Template used for this series' })
  @Expose()
  @Type(() => SeriesTemplateDto)
  template?: SeriesTemplateDto;

  @ApiProperty({ description: 'Series statistics' })
  @Expose()
  @Type(() => SeriesStatsDto)
  stats: SeriesStatsDto;

  @ApiPropertyOptional({
    description: 'Recent videos from this series',
    type: 'array',
  })
  @Expose()
  recentVideos?: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}
