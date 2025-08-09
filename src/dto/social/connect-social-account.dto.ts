import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class ConnectSocialAccountDto {
  @ApiProperty({
    description: 'Social media platform',
    enum: ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'linkedin'],
    example: 'youtube',
  })
  @IsEnum(['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'linkedin'])
  platform:
    | 'youtube'
    | 'tiktok'
    | 'instagram'
    | 'facebook'
    | 'twitter'
    | 'linkedin';

  @ApiProperty({
    description: 'Platform-specific user ID',
    example: 'UCxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  platformUserId: string;

  @ApiProperty({
    description: 'Username on the platform',
    example: 'techcreator123',
  })
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: 'Display name on the platform' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'OAuth access token (will be encrypted)' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({
    description: 'OAuth refresh token (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Token expiration timestamp' })
  @IsOptional()
  @IsString()
  tokenExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Follower count', example: 1500 })
  @IsOptional()
  followerCount?: number;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the account is verified',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Enable automatic posting',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoPost?: boolean;
}
