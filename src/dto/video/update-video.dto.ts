import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { CreateVideoDto } from './create-video.dto';

export class UpdateVideoDto extends PartialType(CreateVideoDto) {
  @ApiPropertyOptional({
    description: 'Video status',
    enum: ['generating', 'completed', 'failed', 'queued', 'processing'],
  })
  @IsOptional()
  @IsEnum(['generating', 'completed', 'failed', 'queued', 'processing'])
  status?: 'generating' | 'completed' | 'failed' | 'queued' | 'processing';

  @ApiPropertyOptional({
    description: 'Generation progress percentage',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  generationProgress?: number;

  @ApiPropertyOptional({ description: 'Error message if generation failed' })
  @IsOptional()
  errorMessage?: string;
}
