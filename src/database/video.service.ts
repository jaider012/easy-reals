import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Video, Prisma } from '@prisma/client';

@Injectable()
export class VideoService {
  constructor(private prisma: PrismaService) {}

  // Create a new video
  async createVideo(data: {
    userId: string;
    seriesId: string;
    title: string;
    description?: string;
    script: string;
    promptUsed: string;
    tags?: string[];
    generationSettings?: any;
  }): Promise<Video> {
    return this.prisma.video.create({
      data: {
        ...data,
        tags: data.tags || [],
        generationSettings: data.generationSettings || {},
      },
    });
  }

  // Find video by ID
  async findVideoById(id: string): Promise<Video | null> {
    return this.prisma.video.findUnique({
      where: { id },
      include: {
        user: true,
        series: true,
        socialPosts: {
          include: {
            socialAccount: true,
          },
        },
      },
    });
  }

  // Get videos for a user
  async getUserVideos(
    userId: string,
    options?: {
      status?: string;
      seriesId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.VideoWhereInput = {
      userId,
      ...(options?.status && { status: options.status }),
      ...(options?.seriesId && { seriesId: options.seriesId }),
    };

    return this.prisma.video.findMany({
      where,
      include: {
        series: true,
        socialPosts: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });
  }

  // Update video status
  async updateVideoStatus(
    id: string,
    status: string,
    progress?: number,
    errorMessage?: string,
  ): Promise<Video> {
    return this.prisma.video.update({
      where: { id },
      data: {
        status,
        ...(progress !== undefined && { generationProgress: progress }),
        ...(errorMessage && { errorMessage }),
        updatedAt: new Date(),
      },
    });
  }

  // Update video with generated content
  async updateVideoContent(
    id: string,
    data: {
      videoUrl?: string;
      thumbnailUrl?: string;
      duration?: number;
      fileSizeMb?: number;
      resolution?: string;
      aiModelUsed?: string;
      generationCost?: number;
      generationTimeSeconds?: number;
      qualityScore?: number;
      contentSafetyScore?: number;
    },
  ): Promise<Video> {
    return this.prisma.video.update({
      where: { id },
      data: {
        ...data,
        status: 'ready',
        generationProgress: 100,
        updatedAt: new Date(),
      },
    });
  }

  // Get videos by status
  async getVideosByStatus(status: string, limit = 50) {
    return this.prisma.video.findMany({
      where: { status },
      include: {
        user: true,
        series: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
    });
  }

  // Get video analytics
  async getVideoAnalytics(userId: string, period = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    return this.prisma.video.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        socialPosts: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Delete video
  async deleteVideo(id: string): Promise<Video> {
    return this.prisma.video.delete({
      where: { id },
    });
  }
}
