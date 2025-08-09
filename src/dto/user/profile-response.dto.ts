import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Transform } from 'class-transformer';

export class ProfileResponseDto {
  @ApiProperty({ description: 'Profile ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'User email address' })
  @Expose()
  email: string;

  @ApiPropertyOptional({ description: 'Full name' })
  @Expose()
  fullName?: string;

  @ApiPropertyOptional({ description: 'Profile avatar URL' })
  @Expose()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'User timezone' })
  @Expose()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Preferred language' })
  @Expose()
  preferredLanguage?: string;

  @ApiPropertyOptional({ description: 'Notification preferences' })
  @Expose()
  notificationPreferences?: Record<string, boolean>;

  @ApiPropertyOptional({ description: 'Business name' })
  @Expose()
  businessName?: string;

  @ApiPropertyOptional({ description: 'Business type' })
  @Expose()
  businessType?: string;

  @ApiProperty({ description: 'Whether profile is active' })
  @Expose()
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last login timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  lastLoginAt?: string;

  @ApiProperty({ description: 'Profile creation timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  createdAt: string;

  @ApiProperty({ description: 'Profile last update timestamp' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Current subscription info' })
  @Expose()
  currentSubscription?: {
    planName: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd: string;
  };

  @ApiPropertyOptional({ description: 'Usage statistics' })
  @Expose()
  usageStats?: {
    videosCreated: number;
    seriesCount: number;
    storageUsed: number;
  };
}
