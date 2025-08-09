import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Exclude } from 'class-transformer';

export class SocialAccountResponseDto {
  @ApiProperty({ description: 'Social account ID' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Social media platform' })
  @Expose()
  platform: string;

  @ApiProperty({ description: 'Platform-specific user ID' })
  @Expose()
  platformUserId: string;

  @ApiProperty({ description: 'Username on the platform' })
  @Expose()
  username: string;

  @ApiPropertyOptional({ description: 'Display name on the platform' })
  @Expose()
  displayName?: string;

  // Exclude sensitive tokens from response
  @Exclude()
  accessToken: string;

  @Exclude()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Token expiration timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  tokenExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Follower count' })
  @Expose()
  followerCount?: number;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @Expose()
  profileImageUrl?: string;

  @ApiPropertyOptional({ description: 'Whether the account is verified' })
  @Expose()
  isVerified?: boolean;

  @ApiProperty({ description: 'Whether account is active' })
  @Expose()
  isActive: boolean;

  @ApiProperty({ description: 'Whether automatic posting is enabled' })
  @Expose()
  autoPost: boolean;

  @ApiProperty({ description: 'When the account was connected' })
  @Expose()
  @Transform(({ value }) => value.toISOString())
  connectedAt: string;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  lastSyncAt?: string;

  @ApiPropertyOptional({ description: 'Connection status indicator' })
  @Expose()
  get connectionStatus(): 'connected' | 'expired' | 'error' {
    if (this.tokenExpiresAt && new Date(this.tokenExpiresAt) < new Date()) {
      return 'expired';
    }
    return this.isActive ? 'connected' : 'error';
  }

  @ApiPropertyOptional({ description: 'Recent posts statistics' })
  @Expose()
  recentStats?: {
    totalPosts: number;
    totalViews: number;
    totalLikes: number;
    avgEngagementRate: number;
  };
}
