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
import { SeriesService } from '../database/series.service';
import { CreateSeriesDto } from '../dto/series/create-series.dto';
import { UpdateSeriesDto } from '../dto/series/update-series.dto';
import { SeriesResponseDto } from '../dto/series/series-response.dto';
import {
  PaginationDto,
  PaginatedResponseDto,
} from '../dto/common/pagination.dto';
import { ErrorResponseDto } from '../dto/common/error-response.dto';
import { plainToClass } from 'class-transformer';

@ApiTags('Series')
@Controller('api/v1/series')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(ClassSerializerInterceptor)
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new content series',
    description: 'Creates a new content series for automated video generation',
  })
  @ApiResponse({
    status: 201,
    description: 'Series created successfully',
    type: SeriesResponseDto,
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
  async createSeries(
    @Request() req,
    @Body() createSeriesDto: CreateSeriesDto,
  ): Promise<SeriesResponseDto> {
    const userId = req.user.id;

    const seriesData = {
      userId,
      ...createSeriesDto,
    };

    const series = await this.seriesService.createSeries(seriesData);

    // Transform to response format
    const response = {
      ...series,
      stats: {
        totalVideosGenerated: series.totalVideosGenerated,
        totalViews: series.totalViews,
        totalLikes: series.totalLikes,
        avgEngagementRate: 0, // Calculate from analytics if needed
      },
      recentVideos: [], // Will be populated from videos relation
    };

    return plainToClass(SeriesResponseDto, response);
  }

  @Get()
  @ApiOperation({
    summary: "Get user's series",
    description:
      'Returns paginated list of series belonging to the authenticated user',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search query' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    description: 'Filter by active status',
    type: Boolean,
  })
  @ApiResponse({
    status: 200,
    description: 'Series retrieved successfully',
    type: [SeriesResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  async getUserSeries(
    @Request() req,
    @Query() paginationDto: PaginationDto,
    @Query('isActive') isActive?: boolean,
  ) {
    const userId = req.user.id;
    const series = await this.seriesService.getUserSeries(userId);

    // Apply filters
    let filteredSeries = series;

    if (isActive !== undefined) {
      filteredSeries = filteredSeries.filter((s) => s.isActive === isActive);
    }

    if (paginationDto.search) {
      const searchTerm = paginationDto.search.toLowerCase();
      filteredSeries = filteredSeries.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm) ||
          s.description?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply pagination
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedSeries = filteredSeries.slice(startIndex, endIndex);

    // Transform to response format
    const responseData = paginatedSeries.map((series) => {
      const stats = {
        totalVideosGenerated: series.totalVideosGenerated,
        totalViews: series.totalViews,
        totalLikes: series.totalLikes,
        avgEngagementRate: 0, // Would calculate from analytics
      };

      // Handle the case where videos relation might not be loaded
      const seriesWithVideos = series as any;
      const recentVideos =
        seriesWithVideos.videos?.map((video: any) => ({
          id: video.id,
          title: video.title,
          status: video.status,
          createdAt: video.createdAt.toISOString(),
        })) || [];

      // Handle the case where template relation might not be loaded
      const seriesWithTemplate = series as any;
      const template = seriesWithTemplate.template
        ? {
            id: seriesWithTemplate.template.id,
            name: seriesWithTemplate.template.name,
            description: seriesWithTemplate.template.description,
            category: seriesWithTemplate.template.category
              ? {
                  id: seriesWithTemplate.template.category.id,
                  name: seriesWithTemplate.template.category.name,
                }
              : undefined,
          }
        : undefined;

      return plainToClass(SeriesResponseDto, {
        ...series,
        stats,
        recentVideos,
        template,
      });
    });

    return new PaginatedResponseDto(
      responseData,
      filteredSeries.length,
      page,
      limit,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get series by ID',
    description: 'Returns detailed information about a specific series',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({
    status: 200,
    description: 'Series retrieved successfully',
    type: SeriesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your series',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  async getSeriesById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<SeriesResponseDto> {
    const userId = req.user.id;
    const series = await this.seriesService.getSeriesById(id);

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    // Check ownership
    if (series.userId !== userId) {
      throw new ForbiddenException('You can only access your own series');
    }

    // Transform to response format
    const stats = {
      totalVideosGenerated: series.totalVideosGenerated,
      totalViews: series.totalViews,
      totalLikes: series.totalLikes,
      avgEngagementRate: 0, // Would calculate from analytics
    };

    const recentVideos =
      (series as any).videos?.map((video: any) => ({
        id: video.id,
        title: video.title,
        status: video.status,
        createdAt: video.createdAt.toISOString(),
      })) || [];

    const template = (series as any).template
      ? {
          id: (series as any).template.id,
          name: (series as any).template.name,
          description: (series as any).template.description,
          category: (series as any).template.category
            ? {
                id: (series as any).template.category.id,
                name: (series as any).template.category.name,
              }
            : undefined,
        }
      : undefined;

    return plainToClass(SeriesResponseDto, {
      ...series,
      stats,
      recentVideos,
      template,
    });
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update series',
    description: 'Updates an existing content series',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({
    status: 200,
    description: 'Series updated successfully',
    type: SeriesResponseDto,
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
    description: 'Forbidden - not your series',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  async updateSeries(
    @Param('id') id: string,
    @Request() req,
    @Body() updateSeriesDto: UpdateSeriesDto,
  ): Promise<SeriesResponseDto> {
    const userId = req.user.id;

    // Verify ownership first
    const existingSeries = await this.seriesService.getSeriesById(id);
    if (!existingSeries) {
      throw new NotFoundException('Series not found');
    }

    if (existingSeries.userId !== userId) {
      throw new ForbiddenException('You can only update your own series');
    }

    try {
      const updatedSeries = await this.seriesService.updateSeries(
        id,
        updateSeriesDto,
      );

      const response = {
        ...updatedSeries,
        stats: {
          totalVideosGenerated: updatedSeries.totalVideosGenerated,
          totalViews: updatedSeries.totalViews,
          totalLikes: updatedSeries.totalLikes,
          avgEngagementRate: 0,
        },
        recentVideos: [],
      };

      return plainToClass(SeriesResponseDto, response);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Series not found');
      }
      throw error;
    }
  }

  @Put(':id/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Toggle series active status',
    description: 'Activates or deactivates a content series',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({
    status: 200,
    description: 'Series status updated successfully',
    type: SeriesResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your series',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  async toggleSeriesStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('isActive') isActive: boolean,
  ): Promise<SeriesResponseDto> {
    const userId = req.user.id;

    // Verify ownership first
    const existingSeries = await this.seriesService.getSeriesById(id);
    if (!existingSeries) {
      throw new NotFoundException('Series not found');
    }

    if (existingSeries.userId !== userId) {
      throw new ForbiddenException('You can only modify your own series');
    }

    const updatedSeries = await this.seriesService.toggleSeriesStatus(
      id,
      isActive,
    );

    const response = {
      ...updatedSeries,
      stats: {
        totalVideosGenerated: updatedSeries.totalVideosGenerated,
        totalViews: updatedSeries.totalViews,
        totalLikes: updatedSeries.totalLikes,
        avgEngagementRate: 0,
      },
      recentVideos: [],
    };

    return plainToClass(SeriesResponseDto, response);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete series',
    description:
      'Permanently deletes a content series and all associated videos',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
  @ApiResponse({
    status: 204,
    description: 'Series deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your series',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  async deleteSeries(@Param('id') id: string, @Request() req): Promise<void> {
    const userId = req.user.id;

    // Verify ownership first
    const existingSeries = await this.seriesService.getSeriesById(id);
    if (!existingSeries) {
      throw new NotFoundException('Series not found');
    }

    if (existingSeries.userId !== userId) {
      throw new ForbiddenException('You can only delete your own series');
    }

    try {
      await this.seriesService.deleteSeries(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Series not found');
      }
      throw error;
    }
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get series analytics',
    description: 'Returns detailed analytics for a specific series',
  })
  @ApiParam({ name: 'id', description: 'Series ID' })
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
    description: 'Forbidden - not your series',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Series not found',
    type: ErrorResponseDto,
  })
  async getSeriesAnalytics(
    @Param('id') id: string,
    @Request() req,
    @Query('days') days: number = 30,
  ) {
    const userId = req.user.id;
    const series = await this.seriesService.getSeriesById(id);

    if (!series) {
      throw new NotFoundException('Series not found');
    }

    if (series.userId !== userId) {
      throw new ForbiddenException(
        'You can only access your own series analytics',
      );
    }

    // This would typically involve complex queries to aggregate analytics data
    // For now, returning basic structure
    return {
      seriesInfo: {
        id: series.id,
        name: series.name,
        createdAt: series.createdAt.toISOString(),
        isActive: series.isActive,
      },
      overview: {
        totalVideos: (series as any).videos?.length || 0,
        totalViews: series.totalViews,
        totalLikes: series.totalLikes,
        avgEngagementRate: 0, // Would calculate from social posts
        avgGenerationTime: 0, // Would calculate from video generation times
      },
      videoPerformance:
        (series as any).videos?.map((video: any) => ({
          id: video.id,
          title: video.title,
          createdAt: video.createdAt.toISOString(),
          status: video.status,
          // Would include social media metrics here
        })) || [],
      trends: {
        // Would include time-series data for views, likes, etc.
        dailyViews: [],
        dailyLikes: [],
        engagementTrend: [],
      },
    };
  }
}
