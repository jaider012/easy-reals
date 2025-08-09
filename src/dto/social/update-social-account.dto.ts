import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ConnectSocialAccountDto } from './connect-social-account.dto';

export class UpdateSocialAccountDto extends PartialType(
  ConnectSocialAccountDto,
) {
  @ApiPropertyOptional({
    description: 'Whether account is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Updated follower count' })
  @IsOptional()
  @IsInt()
  @Min(0)
  followerCount?: number;
}
