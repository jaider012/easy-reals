import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ description: 'Series ID this video belongs to' })
  @IsUUID()
  seriesId: string;

  @ApiProperty({
    description: 'Video title',
    example: 'How to Build a REST API',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Script or content for the video' })
  @IsString()
  script: string;

  @ApiPropertyOptional({
    description: 'Tags for the video',
    example: ['tutorial', 'programming', 'api'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom prompt used for generation if different from series',
  })
  @IsOptional()
  @IsString()
  customPrompt?: string;

  @ApiPropertyOptional({
    description: 'Generation settings specific to this video',
    example: { voice: 'male', speed: 1.2, style: 'professional' },
  })
  @IsOptional()
  @IsObject()
  generationSettings?: Record<string, any>;
}

export class GenerateVideoDto {
  @ApiProperty({ description: 'Series ID to generate video for' })
  @IsUUID()
  seriesId: string;

  @ApiPropertyOptional({ description: 'Specific topic or title for the video' })
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({
    description: 'Generation settings override',
    example: { urgency: 'high', style: 'casual' },
  })
  @IsOptional()
  @IsObject()
  generationSettings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Priority level for generation queue',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  })
  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}
