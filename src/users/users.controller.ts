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
import { UserService } from '../database/user.service';
import { CreateProfileDto } from '../dto/user/create-profile.dto';
import { UpdateProfileDto } from '../dto/user/update-profile.dto';
import { ProfileResponseDto } from '../dto/user/profile-response.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../dto/common/pagination.dto';
import { ErrorResponseDto } from '../dto/common/error-response.dto';
import { plainToClass } from 'class-transformer';

@ApiTags('Users')
@Controller('api/v1/users')
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user profile',
    description:
      'Creates a new user profile. This is typically called after Supabase auth registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Profile already exists',
    type: ErrorResponseDto,
  })
  async createProfile(
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    try {
      // Generate a UUID for the profile (in production, this would come from Supabase auth)
      const profileData = {
        id: crypto.randomUUID(),
        ...createProfileDto,
      };

      const profile = await this.userService.createProfile(profileData);
      return plainToClass(ProfileResponseDto, {
        ...profile,
        usageStats: {
          videosCreated: 0,
          seriesCount: 0,
          storageUsed: 0,
        },
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Profile with this email already exists');
      }
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Returns the authenticated user's profile with usage statistics",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  async getCurrentProfile(@Request() req): Promise<ProfileResponseDto> {
    const userId = req.user.id;
    const profile = await this.userService.getProfileWithAnalytics(userId);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Calculate usage statistics
    const usageStats = {
      videosCreated: profile.videos.length,
      seriesCount: profile.userSeries.length,
      storageUsed: (profile as any).userSubscriptions?.[0]?.storageUsedGb || 0,
    };

    // Format current subscription info
    const currentSubscription = profile.userSubscriptions[0]
      ? {
          planName: profile.userSubscriptions[0].plan.name,
          status: profile.userSubscriptions[0].status,
          billingCycle: profile.userSubscriptions[0].billingCycle,
          currentPeriodEnd:
            profile.userSubscriptions[0].currentPeriodEnd?.toISOString(),
        }
      : undefined;

    return plainToClass(ProfileResponseDto, {
      ...profile,
      currentSubscription,
      usageStats,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile by ID',
    description: 'Returns a user profile by ID (admin or self only)',
  })
  @ApiParam({ name: 'id', description: 'User profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own profile',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  async getProfileById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<ProfileResponseDto> {
    const currentUserId = req.user.id;

    // Users can only access their own profile (unless admin - add role check later)
    if (id !== currentUserId) {
      throw new BadRequestException('You can only access your own profile');
    }

    const profile = await this.userService.findProfileById(id);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Calculate basic usage stats
    const usageStats = {
      videosCreated: (profile as any).videos?.length || 0,
      seriesCount: (profile as any).userSeries?.length || 0,
      storageUsed: (profile as any).userSubscriptions?.[0]?.storageUsedGb || 0,
    };

    return plainToClass(ProfileResponseDto, {
      ...profile,
      usageStats,
    });
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update current user profile',
    description: "Updates the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async updateCurrentProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const userId = req.user.id;

    try {
      const updatedProfile = await this.userService.updateProfile(
        userId,
        updateProfileDto,
      );

      return plainToClass(ProfileResponseDto, {
        ...updatedProfile,
        usageStats: {
          videosCreated: 0, // Would need to query separately for exact count
          seriesCount: 0,
          storageUsed: 0,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Deactivate current user profile',
    description:
      "Soft deletes the authenticated user's profile by setting isActive to false",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile deactivated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Profile not found',
    type: ErrorResponseDto,
  })
  async deactivateCurrentProfile(@Request() req): Promise<ProfileResponseDto> {
    const userId = req.user.id;

    try {
      const deactivatedProfile =
        await this.userService.deactivateProfile(userId);

      return plainToClass(ProfileResponseDto, {
        ...deactivatedProfile,
        usageStats: {
          videosCreated: 0,
          seriesCount: 0,
          storageUsed: 0,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Profile not found');
      }
      throw error;
    }
  }

  @Get('me/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user analytics dashboard',
    description:
      "Returns comprehensive analytics for the authenticated user's content",
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
  async getUserAnalytics(@Request() req) {
    const userId = req.user.id;
    const profile = await this.userService.getProfileWithAnalytics(userId);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Process analytics data
    const analytics = {
      overview: {
        totalVideos: profile.videos.length,
        totalSeries: profile.userSeries.length,
        totalViews: profile.analyticsDaily.reduce(
          (sum, day) => sum + day.totalViews,
          0,
        ),
        totalLikes: profile.analyticsDaily.reduce(
          (sum, day) => sum + day.totalLikes,
          0,
        ),
        avgEngagementRate:
          profile.analyticsDaily.length > 0
            ? profile.analyticsDaily.reduce(
                (sum, day) => sum + Number(day.avgEngagementRate),
                0,
              ) / profile.analyticsDaily.length
            : 0,
      },
      dailyStats: profile.analyticsDaily.map((day) => ({
        date: day.date.toISOString().split('T')[0],
        views: day.totalViews,
        likes: day.totalLikes,
        comments: day.totalComments,
        shares: day.totalShares,
        engagementRate: Number(day.avgEngagementRate),
        videosGenerated: day.videosGenerated,
        videosPublished: day.videosPublished,
      })),
      socialAccounts: profile.socialAccounts.map((account) => ({
        platform: account.platform,
        username: account.username,
        isActive: account.isActive,
        autoPost: account.autoPost,
        followerCount: account.followerCount,
        connectedAt: account.connectedAt.toISOString(),
      })),
      recentVideos: profile.videos.map((video) => ({
        id: video.id,
        title: video.title,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
        series: profile.userSeries.find((s) => s.id === video.seriesId)?.name,
      })),
    };

    return analytics;
  }
}
