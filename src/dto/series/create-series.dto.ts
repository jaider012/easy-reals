import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  IsUUID,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateSeriesDto {
  @ApiProperty({ description: 'Series name', example: 'Tech Tutorials' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Series description',
    example: 'Educational content about technology',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Template ID to base this series on' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Custom prompt for content generation' })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiPropertyOptional({
    description: 'Visual style settings',
    example: { theme: 'modern', colors: ['#ff6b6b', '#4ecdc4'] },
  })
  @IsOptional()
  @IsObject()
  visualStyle?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Voice settings for narration',
    example: { voice: 'female', speed: 1.0, pitch: 0 },
  })
  @IsOptional()
  @IsObject()
  voiceSettings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Music and audio settings',
    example: { backgroundMusic: true, volume: 0.3 },
  })
  @IsOptional()
  @IsObject()
  musicSettings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Posting frequency per week',
    example: 3,
    minimum: 1,
    maximum: 14,
    default: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  @Type(() => Number)
  postingFrequency?: number;

  @ApiPropertyOptional({
    description: 'Posting schedule configuration',
    example: {
      days: ['monday', 'wednesday', 'friday'],
      times: ['09:00', '15:00'],
    },
  })
  @IsOptional()
  @IsObject()
  postingSchedule?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Video duration in seconds',
    example: 60,
    minimum: 15,
    maximum: 300,
    default: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(300)
  @Type(() => Number)
  videoDuration?: number;

  @ApiPropertyOptional({
    description: 'Content style preference',
    example: 'engaging',
    enum: [
      'engaging',
      'educational',
      'entertaining',
      'informative',
      'motivational',
    ],
  })
  @IsOptional()
  @IsString()
  @IsEnum([
    'engaging',
    'educational',
    'entertaining',
    'informative',
    'motivational',
  ])
  contentStyle?: string;

  @ApiPropertyOptional({
    description: 'Whether to use trending topics for content generation',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  useTrendingTopics?: boolean;

  @ApiPropertyOptional({
    description: 'Whether series is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
