import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  ClassSerializerInterceptor,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { SocialAccountService } from '../database/social-account.service';
import { ConnectSocialAccountDto } from '../dto/social/connect-social-account.dto';
import { UpdateSocialAccountDto } from '../dto/social/update-social-account.dto';
import { SocialAccountResponseDto } from '../dto/social/social-account-response.dto';
import { ErrorResponseDto } from '../dto/common/error-response.dto';
import { plainToClass } from 'class-transformer';

@ApiTags('Social Accounts')
@Controller('api/v1/social-accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class SocialController {
  constructor(private readonly socialAccountService: SocialAccountService) {}

  @Post('connect')
  @ApiOperation({
    summary: 'Connect a social media account',
    description: 'Connects a new social media account for automated posting',
  })
  @ApiResponse({
    status: 201,
    description: 'Social account connected successfully',
    type: SocialAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or platform not supported',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Account already connected',
    type: ErrorResponseDto,
  })
  async connectSocialAccount(
    @Request() req,
    @Body() connectDto: ConnectSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    const userId = req.user.id;

    // Check if account is already connected
    const existingAccount =
      await this.socialAccountService.getSocialAccountByPlatform(
        userId,
        connectDto.platform,
      );

    if (existingAccount) {
      throw new ConflictException(
        `${connectDto.platform} account is already connected. Disconnect the existing one first.`,
      );
    }

    try {
      // TODO: Validate OAuth tokens with the actual platform API
      // For now, we'll assume tokens are valid

      const tokenExpiresAt = connectDto.tokenExpiresAt
        ? new Date(connectDto.tokenExpiresAt)
        : undefined;

      const accountData = {
        userId,
        ...connectDto,
        tokenExpiresAt,
      };

      const socialAccount =
        await this.socialAccountService.connectAccount(accountData);

      // Calculate recent stats (will be empty for new accounts)
      const response = {
        ...socialAccount,
        recentStats: {
          totalPosts: 0,
          totalViews: 0,
          totalLikes: 0,
          avgEngagementRate: 0,
        },
      };

      return plainToClass(SocialAccountResponseDto, response);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('This social account is already connected');
      }
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: "Get user's connected social accounts",
    description:
      'Returns all social media accounts connected by the authenticated user',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: 'Filter by platform',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Social accounts retrieved successfully',
    type: [SocialAccountResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async getUserSocialAccounts(
    @Request() req,
    @Query('platform') platform?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<SocialAccountResponseDto[]> {
    const userId = req.user.id;
    let accounts =
      await this.socialAccountService.getUserSocialAccounts(userId);

    // Apply filters
    if (platform) {
      accounts = accounts.filter((account) => account.platform === platform);
    }

    if (isActive !== undefined) {
      accounts = accounts.filter((account) => account.isActive === isActive);
    }

    // Transform to response format with recent stats
    const responseData = accounts.map((account) => {
      const recentPosts = (account as any).socialPosts || [];
      const totalViews = recentPosts.reduce(
        (sum, post) => sum + post.viewsCount,
        0,
      );
      const totalLikes = recentPosts.reduce(
        (sum, post) => sum + post.likesCount,
        0,
      );
      const avgEngagementRate =
        recentPosts.length > 0
          ? recentPosts.reduce(
              (sum, post) => sum + Number(post.engagementRate),
              0,
            ) / recentPosts.length
          : 0;

      return plainToClass(SocialAccountResponseDto, {
        ...account,
        recentStats: {
          totalPosts: recentPosts.length,
          totalViews,
          totalLikes,
          avgEngagementRate,
        },
      });
    });

    return responseData;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get social account by ID',
    description: 'Returns detailed information about a specific social account',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiResponse({
    status: 200,
    description: 'Social account retrieved successfully',
    type: SocialAccountResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async getSocialAccountById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SocialAccountResponseDto> {
    const userId = req.user.id;
    const account = await this.socialAccountService.getSocialAccountById(id);

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    // Check ownership
    if (account.userId !== userId) {
      throw new ForbiddenException(
        'You can only access your own social accounts',
      );
    }

    // Calculate recent stats
    const recentPosts = (account as any).socialPosts || [];
    const totalViews = recentPosts.reduce(
      (sum, post) => sum + post.viewsCount,
      0,
    );
    const totalLikes = recentPosts.reduce(
      (sum, post) => sum + post.likesCount,
      0,
    );
    const avgEngagementRate =
      recentPosts.length > 0
        ? recentPosts.reduce(
            (sum, post) => sum + Number(post.engagementRate),
            0,
          ) / recentPosts.length
        : 0;

    return plainToClass(SocialAccountResponseDto, {
      ...account,
      recentStats: {
        totalPosts: recentPosts.length,
        totalViews,
        totalLikes,
        avgEngagementRate,
      },
    });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update social account settings',
    description: 'Updates social account configuration and settings',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiResponse({
    status: 200,
    description: 'Social account updated successfully',
    type: SocialAccountResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async updateSocialAccount(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateSocialAccountDto,
  ): Promise<SocialAccountResponseDto> {
    const userId = req.user.id;

    // Verify ownership
    const existingAccount =
      await this.socialAccountService.getSocialAccountById(id);
    if (!existingAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (existingAccount.userId !== userId) {
      throw new ForbiddenException(
        'You can only update your own social accounts',
      );
    }

    try {
      const updateData: any = { ...updateDto };

      // Handle token expiration date conversion
      if (updateDto.tokenExpiresAt) {
        updateData.tokenExpiresAt = new Date(updateDto.tokenExpiresAt);
      }

      const updatedAccount =
        await this.socialAccountService.updateSocialAccount(id, updateData);

      return plainToClass(SocialAccountResponseDto, {
        ...updatedAccount,
        recentStats: {
          totalPosts: 0, // Would need to recalculate
          totalViews: 0,
          totalLikes: 0,
          avgEngagementRate: 0,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Social account not found');
      }
      throw error;
    }
  }

  @Put(':id/toggle-auto-post')
  @ApiOperation({
    summary: 'Toggle auto-posting',
    description: 'Enables or disables automatic posting for the social account',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiResponse({
    status: 200,
    description: 'Auto-post setting updated successfully',
    type: SocialAccountResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async toggleAutoPost(
    @Param('id') id: string,
    @Request() req,
    @Body('autoPost') autoPost: boolean,
  ): Promise<SocialAccountResponseDto> {
    const userId = req.user.id;

    // Verify ownership
    const existingAccount =
      await this.socialAccountService.getSocialAccountById(id);
    if (!existingAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (existingAccount.userId !== userId) {
      throw new ForbiddenException(
        'You can only modify your own social accounts',
      );
    }

    const updatedAccount = await this.socialAccountService.toggleAutoPost(
      id,
      autoPost,
    );

    return plainToClass(SocialAccountResponseDto, {
      ...updatedAccount,
      recentStats: {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        avgEngagementRate: 0,
      },
    });
  }

  @Put(':id/sync')
  @ApiOperation({
    summary: 'Sync social account data',
    description:
      'Syncs follower count and other metrics from the social platform',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiResponse({
    status: 200,
    description: 'Social account synced successfully',
    type: SocialAccountResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async syncSocialAccount(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SocialAccountResponseDto> {
    const userId = req.user.id;

    // Verify ownership
    const existingAccount =
      await this.socialAccountService.getSocialAccountById(id);
    if (!existingAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (existingAccount.userId !== userId) {
      throw new ForbiddenException(
        'You can only sync your own social accounts',
      );
    }

    // TODO: Implement actual platform API calls to get updated data
    // For now, we'll just update the lastSyncAt timestamp
    const updatedAccount = await this.socialAccountService.updateAccountMetrics(
      id,
      {
        // In real implementation, these would come from platform APIs
        followerCount: existingAccount.followerCount,
        profileImageUrl: existingAccount.profileImageUrl,
        isVerified: existingAccount.isVerified,
      },
    );

    return plainToClass(SocialAccountResponseDto, {
      ...updatedAccount,
      recentStats: {
        totalPosts: 0,
        totalViews: 0,
        totalLikes: 0,
        avgEngagementRate: 0,
      },
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Disconnect social account',
    description:
      'Removes the social account connection and deletes all associated data',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiResponse({
    status: 204,
    description: 'Social account disconnected successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async disconnectSocialAccount(
    @Param('id') id: string,
    @Request() req,
  ): Promise<void> {
    const userId = req.user.id;

    // Verify ownership
    const existingAccount =
      await this.socialAccountService.getSocialAccountById(id);
    if (!existingAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (existingAccount.userId !== userId) {
      throw new ForbiddenException(
        'You can only disconnect your own social accounts',
      );
    }

    try {
      await this.socialAccountService.disconnectAccount(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Social account not found');
      }
      throw error;
    }
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get social account analytics',
    description: 'Returns detailed analytics for a specific social account',
  })
  @ApiParam({ name: 'id', description: 'Social account ID' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days to include (default: 30)',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your social account',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Social account not found',
    type: ErrorResponseDto,
  })
  async getSocialAccountAnalytics(
    @Param('id') id: string,
    @Request() req,
    @Query('days') days: number = 30,
  ) {
    const userId = req.user.id;

    // Verify ownership
    const existingAccount =
      await this.socialAccountService.getSocialAccountById(id);
    if (!existingAccount) {
      throw new NotFoundException('Social account not found');
    }

    if (existingAccount.userId !== userId) {
      throw new ForbiddenException(
        'You can only access your own social account analytics',
      );
    }

    const analytics = await this.socialAccountService.getAccountAnalytics(
      id,
      days,
    );

    if (!analytics) {
      throw new NotFoundException('Analytics data not found');
    }

    return analytics;
  }

  @Get('platforms/supported')
  @ApiOperation({
    summary: 'Get supported social media platforms',
    description:
      'Returns list of supported social media platforms and their requirements',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported platforms retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async getSupportedPlatforms() {
    return {
      platforms: [
        {
          platform: 'youtube',
          name: 'YouTube',
          description: 'Upload videos to YouTube',
          requiredScopes: ['https://www.googleapis.com/auth/youtube.upload'],
          features: ['video_upload', 'analytics', 'live_streaming'],
          maxFileSize: '128GB',
          supportedFormats: ['mp4', 'mov', 'avi', 'wmv', 'flv', 'webm'],
        },
        {
          platform: 'tiktok',
          name: 'TikTok',
          description: 'Share short-form videos on TikTok',
          requiredScopes: ['video.upload', 'user.info.basic'],
          features: ['video_upload', 'analytics'],
          maxFileSize: '4GB',
          supportedFormats: ['mp4', 'mov'],
          maxDuration: 600, // 10 minutes in seconds
        },
        {
          platform: 'instagram',
          name: 'Instagram',
          description: 'Share videos and reels on Instagram',
          requiredScopes: ['instagram_basic', 'instagram_content_publish'],
          features: ['video_upload', 'reels', 'stories', 'analytics'],
          maxFileSize: '4GB',
          supportedFormats: ['mp4', 'mov'],
          maxDuration: 3600, // 60 minutes for reels
        },
        {
          platform: 'facebook',
          name: 'Facebook',
          description: 'Share videos on Facebook',
          requiredScopes: ['pages_manage_posts', 'pages_show_list'],
          features: ['video_upload', 'analytics', 'live_streaming'],
          maxFileSize: '10GB',
          supportedFormats: ['mp4', 'mov', 'avi'],
        },
        {
          platform: 'twitter',
          name: 'Twitter/X',
          description: 'Share videos on Twitter/X',
          requiredScopes: ['tweet.write', 'users.read'],
          features: ['video_upload', 'analytics'],
          maxFileSize: '512MB',
          supportedFormats: ['mp4', 'mov'],
          maxDuration: 140, // 2 minutes 20 seconds
        },
        {
          platform: 'linkedin',
          name: 'LinkedIn',
          description: 'Share professional video content on LinkedIn',
          requiredScopes: ['w_member_social', 'r_basicprofile'],
          features: ['video_upload', 'analytics'],
          maxFileSize: '5GB',
          supportedFormats: ['mp4', 'mov', 'wmv'],
          maxDuration: 600, // 10 minutes
        },
      ],
    };
  }
}
