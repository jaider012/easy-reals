import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  IsEnum,
} from 'class-validator';

export class CreateProfileDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Full name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'UTC',
    default: 'UTC',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Preferred language',
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsString()
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: { email: true, push: true },
    default: { email: true, push: true },
  })
  @IsOptional()
  @IsObject()
  notificationPreferences?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Business name', example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    description: 'Business type',
    example: 'e-commerce',
    enum: ['e-commerce', 'saas', 'agency', 'creator', 'other'],
  })
  @IsOptional()
  @IsString()
  businessType?: string;
}
