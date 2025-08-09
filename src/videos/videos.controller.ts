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
import { VideoService } from '../database/video.service';
import { SeriesService } from '../database/series.service';
import {
  CreateVideoDto,
  GenerateVideoDto,
} from '../dto/video/create-video.dto';
import { UpdateVideoDto } from '../dto/video/update-video.dto';
import { VideoResponseDto } from '../dto/video/video-response.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../dto/common/pagination.dto';
import { ErrorResponseDto } from '../dto/common/error-response.dto';
import { plainToClass } from 'class-transformer';

@ApiTags('Videos')
@Controller('api/v1/videos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class VideosController {
  constructor(
    private readonly videoService: VideoService,
    private readonly seriesService: SeriesService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new video',
    description:
      'Manually creates a video with provided content (not AI-generated)',
  })
  @ApiResponse({
    status: 201,
    description: 'Video created successfully',
    type: VideoResponseDto,
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
    description: 'Series does not belong to user',
    type: ErrorResponseDto,
  })
  async createVideo(
    @Request() req,
    @Body() createVideoDto: CreateVideoDto,
  ): Promise<VideoResponseDto> {
    const userId = req.user.id;

    // Verify series ownership
    const series = await this.seriesService.getSeriesById(
      createVideoDto.seriesId,
    );
    if (!series) {
      throw new BadRequestException('Series not found');
    }

    if (series.userId !== userId) {
      throw new ForbiddenException(
        'You can only create videos in your own series',
      );
    }

    // Create video with manual content
    const videoData = {
      userId,
      ...createVideoDto,
      promptUsed:
        createVideoDto.customPrompt ||
        series.customPrompt ||
        'Manual video creation',
      tags: createVideoDto.tags || [],
    };

    const video = await this.videoService.createVideo(videoData);

    // Transform to response format
    const response = {
      ...video,
      series: {
        id: series.id,
        name: series.name,
      },
      socialPosts: [], // Empty for new video
    };

    return plainToClass(VideoResponseDto, response);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate a new video with AI',
    description:
      'Queues a new video for AI generation based on series settings',
  })
  @ApiResponse({
    status: 202,
    description: 'Video generation queued successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or series not found',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Series does not belong to user or subscription limits exceeded',
    type: ErrorResponseDto,
  })
  async generateVideo(
    @Request() req,
    @Body() generateVideoDto: GenerateVideoDto,
  ): Promise<VideoResponseDto> {
    const userId = req.user.id;

    // Verify series ownership and settings
    const series = await this.seriesService.getSeriesById(
      generateVideoDto.seriesId,
    );
    if (!series) {
      throw new BadRequestException('Series not found');
    }

    if (series.userId !== userId) {
      throw new ForbiddenException(
        'You can only generate videos in your own series',
      );
    }

    if (!series.isActive) {
      throw new BadRequestException(
        'Cannot generate videos for inactive series',
      );
    }

    // TODO: Check subscription limits here
    // const subscription = await this.checkSubscriptionLimits(userId);

    // Create video record in "queued" status
    const videoTitle =
      generateVideoDto.topic ||
      `${series.name} Episode ${series.totalVideosGenerated + 1}`;
    const prompt =
      series.customPrompt ||
      'Generate engaging video content based on series theme';

    const videoData = {
      userId,
      seriesId: generateVideoDto.seriesId,
      title: videoTitle,
      description: `Auto-generated video for ${series.name} series`,
      script: '[AI Generated Script - Processing...]',
      promptUsed: prompt,
      generationSettings: {
        ...((series.visualStyle as Record<string, any>) || {}),
        ...((series.voiceSettings as Record<string, any>) || {}),
        ...((series.musicSettings as Record<string, any>) || {}),
        duration: series.videoDuration,
        style: series.contentStyle,
        useTrending: series.useTrendingTopics,
        priority: generateVideoDto.priority || 'normal',
        ...generateVideoDto.generationSettings,
      },
      tags: [`${series.name}`, 'ai-generated'],
    };

    // Create video with "queued" status
    const video = await this.videoService.createVideo(videoData);

    // Update video status to queued for generation
    await this.videoService.updateVideoStatus(video.id, 'queued', 0);

    // TODO: Add to background job queue for actual generation
    // await this.jobQueueService.addVideoGenerationJob(video.id, generateVideoDto.priority);

    // Update series stats
    await this.seriesService.updateSeriesStats(generateVideoDto.seriesId, {
      totalVideosGenerated: series.totalVideosGenerated + 1,
    });

    const response = {
      ...video,
      status: 'queued',
      generationProgress: 0,
      series: {
        id: series.id,
        name: series.name,
      },
      socialPosts: [],
    };

    return plainToClass(VideoResponseDto, response);
  }

  @Get()
  @ApiOperation({
    summary: "Get user's videos",
    description:
      'Returns paginated list of videos belonging to the authenticated user',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'seriesId',
    required: false,
    description: 'Filter by series ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Videos retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async getUserVideos(
    @Request() req,
    @Query() paginationDto: PaginationDto,
    @Query('status') status?: string,
    @Query('seriesId') seriesId?: string,
  ) {
    const userId = req.user.id;
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const offset = (page - 1) * limit;

    const videos = await this.videoService.getUserVideos(userId, {
      status,
      seriesId,
      limit,
      offset,
    });

    // Apply search filter if provided
    let filteredVideos = videos;
    if (paginationDto.search) {
      const searchTerm = paginationDto.search.toLowerCase();
      filteredVideos = videos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchTerm) ||
          video.description?.toLowerCase().includes(searchTerm) ||
          video.tags.some((tag) => tag.toLowerCase().includes(searchTerm)),
      );
    }

    // Transform to response format
    const responseData = filteredVideos.map((video) => {
      const socialPosts =
        (video as any).socialPosts?.map((post: any) => ({
          id: post.id,
          platform: post.platform,
          status: post.status,
          scheduledFor: post.scheduledFor?.toISOString(),
          publishedAt: post.publishedAt?.toISOString(),
          viewsCount: post.viewsCount,
          likesCount: post.likesCount,
        })) || [];

      return plainToClass(VideoResponseDto, {
        ...video,
        series: {
          id: (video as any).series.id,
          name: (video as any).series.name,
        },
        socialPosts,
      });
    });

    // For pagination, we'd need a separate count query in a real implementation
    const total = filteredVideos.length;
    return new PaginatedResponseDto(responseData, total, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get video by ID',
    description: 'Returns detailed information about a specific video',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video retrieved successfully',
    type: VideoResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your video',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    type: ErrorResponseDto,
  })
  async getVideoById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<VideoResponseDto> {
    const userId = req.user.id;
    const video = await this.videoService.findVideoById(id);

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Check ownership
    if (video.userId !== userId) {
      throw new ForbiddenException('You can only access your own videos');
    }

    // Transform social posts
    const socialPosts =
      (video as any).socialPosts?.map((post: any) => ({
        id: post.id,
        platform: post.platform,
        status: post.status,
        scheduledFor: post.scheduledFor?.toISOString(),
        publishedAt: post.publishedAt?.toISOString(),
        viewsCount: post.viewsCount,
        likesCount: post.likesCount,
      })) || [];

    return plainToClass(VideoResponseDto, {
      ...video,
      series: {
        id: (video as any).series.id,
        name: (video as any).series.name,
      },
      socialPosts,
    });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update video',
    description: 'Updates video metadata (title, description, tags, etc.)',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 200,
    description: 'Video updated successfully',
    type: VideoResponseDto,
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
    description: 'Forbidden - not your video',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    type: ErrorResponseDto,
  })
  async updateVideo(
    @Param('id') id: string,
    @Request() req,
    @Body() updateVideoDto: UpdateVideoDto,
  ): Promise<VideoResponseDto> {
    const userId = req.user.id;

    // Verify ownership
    const existingVideo = await this.videoService.findVideoById(id);
    if (!existingVideo) {
      throw new NotFoundException('Video not found');
    }

    if (existingVideo.userId !== userId) {
      throw new ForbiddenException('You can only update your own videos');
    }

    try {
      // For status updates, use the specialized method
      if (updateVideoDto.status) {
        await this.videoService.updateVideoStatus(
          id,
          updateVideoDto.status,
          updateVideoDto.generationProgress,
          updateVideoDto.errorMessage,
        );
      }

      // Update other fields if provided
      const updateData: any = {};
      if (updateVideoDto.title) updateData.title = updateVideoDto.title;
      if (updateVideoDto.description !== undefined)
        updateData.description = updateVideoDto.description;
      if (updateVideoDto.script) updateData.script = updateVideoDto.script;
      if (updateVideoDto.tags) updateData.tags = updateVideoDto.tags;
      if (updateVideoDto.generationSettings)
        updateData.generationSettings = updateVideoDto.generationSettings;

      if (Object.keys(updateData).length > 0) {
        await this.videoService.updateVideoContent(id, updateData);
      }

      // Fetch updated video
      const updatedVideo = await this.videoService.findVideoById(id);

      const socialPosts =
        (updatedVideo as any).socialPosts?.map((post: any) => ({
          id: post.id,
          platform: post.platform,
          status: post.status,
          scheduledFor: post.scheduledFor?.toISOString(),
          publishedAt: post.publishedAt?.toISOString(),
          viewsCount: post.viewsCount,
          likesCount: post.likesCount,
        })) || [];

      return plainToClass(VideoResponseDto, {
        ...updatedVideo,
        series: {
          id: (updatedVideo as any).series.id,
          name: (updatedVideo as any).series.name,
        },
        socialPosts,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Video not found');
      }
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete video',
    description: 'Permanently deletes a video and all associated social posts',
  })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiResponse({
    status: 204,
    description: 'Video deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your video',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Video not found',
    type: ErrorResponseDto,
  })
  async deleteVideo(@Param('id') id: string, @Request() req): Promise<void> {
    const userId = req.user.id;

    // Verify ownership
    const existingVideo = await this.videoService.findVideoById(id);
    if (!existingVideo) {
      throw new NotFoundException('Video not found');
    }

    if (existingVideo.userId !== userId) {
      throw new ForbiddenException('You can only delete your own videos');
    }

    try {
      await this.videoService.deleteVideo(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Video not found');
      }
      throw error;
    }
  }

  @Get('analytics/dashboard')
  @ApiOperation({
    summary: 'Get video analytics dashboard',
    description:
      'Returns comprehensive video analytics for the authenticated user',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Period in days (default: 30)',
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
  async getVideoAnalytics(
    @Request() req,
    @Query('period') period: number = 30,
  ) {
    const userId = req.user.id;
    const videos = await this.videoService.getVideoAnalytics(userId, period);

    // Process analytics data
    const statusCounts = videos.reduce((acc, video) => {
      acc[video.status] = (acc[video.status] || 0) + 1;
      return acc;
    }, {});

    const totalSocialPosts = videos.reduce(
      (sum, video) => sum + (video.socialPosts?.length || 0),
      0,
    );
    const totalViews = videos.reduce(
      (sum, video) =>
        sum +
        (video.socialPosts?.reduce(
          (postSum, post) => postSum + post.viewsCount,
          0,
        ) || 0),
      0,
    );
    const totalLikes = videos.reduce(
      (sum, video) =>
        sum +
        (video.socialPosts?.reduce(
          (postSum, post) => postSum + post.likesCount,
          0,
        ) || 0),
      0,
    );

    const avgGenerationCost =
      videos.length > 0
        ? videos.reduce(
            (sum, video) => sum + Number(video.generationCost || 0),
            0,
          ) / videos.length
        : 0;

    return {
      overview: {
        totalVideos: videos.length,
        totalSocialPosts,
        totalViews,
        totalLikes,
        avgGenerationCost,
        statusDistribution: statusCounts,
      },
      recentVideos: videos.slice(0, 10).map((video) => ({
        id: video.id,
        title: video.title,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
        socialPostsCount: video.socialPosts?.length || 0,
        totalViews:
          video.socialPosts?.reduce((sum, post) => sum + post.viewsCount, 0) ||
          0,
      })),
      performanceMetrics: {
        avgViewsPerVideo: videos.length > 0 ? totalViews / videos.length : 0,
        avgLikesPerVideo: videos.length > 0 ? totalLikes / videos.length : 0,
        engagementRate: totalViews > 0 ? (totalLikes / totalViews) * 100 : 0,
      },
    };
  }
}
