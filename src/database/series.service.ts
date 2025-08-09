import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserSeries, Prisma } from '@prisma/client';

@Injectable()
export class SeriesService {
  constructor(private prisma: PrismaService) {}

  // Create a new series
  async createSeries(data: {
    userId: string;
    templateId?: string;
    name: string;
    description?: string;
    customPrompt?: string;
    visualStyle?: any;
    voiceSettings?: any;
    musicSettings?: any;
    videoDuration?: number;
    postingFrequency?: number;
    postingSchedule?: any;
  }): Promise<UserSeries> {
    return this.prisma.userSeries.create({
      data: {
        ...data,
        visualStyle: data.visualStyle || {},
        voiceSettings: data.voiceSettings || {},
        musicSettings: data.musicSettings || {},
        postingSchedule: data.postingSchedule || {},
      },
    });
  }

  // Get user's series
  async getUserSeries(userId: string): Promise<UserSeries[]> {
    return this.prisma.userSeries.findMany({
      where: { userId },
      include: {
        template: {
          include: {
            category: true,
          },
        },
        videos: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get series by ID
  async getSeriesById(id: string): Promise<UserSeries | null> {
    return this.prisma.userSeries.findUnique({
      where: { id },
      include: {
        user: true,
        template: {
          include: {
            category: true,
          },
        },
        videos: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  // Update series
  async updateSeries(
    id: string,
    data: Prisma.UserSeriesUpdateInput,
  ): Promise<UserSeries> {
    return this.prisma.userSeries.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  // Toggle series active status
  async toggleSeriesStatus(id: string, isActive: boolean): Promise<UserSeries> {
    return this.prisma.userSeries.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });
  }

  // Update series stats
  async updateSeriesStats(
    id: string,
    stats: {
      totalVideosGenerated?: number;
      totalViews?: number;
      totalLikes?: number;
    },
  ): Promise<UserSeries> {
    const current = await this.prisma.userSeries.findUnique({
      where: { id },
      select: {
        totalVideosGenerated: true,
        totalViews: true,
        totalLikes: true,
      },
    });

    if (!current) {
      throw new Error('Series not found');
    }

    return this.prisma.userSeries.update({
      where: { id },
      data: {
        totalVideosGenerated:
          stats.totalVideosGenerated !== undefined
            ? stats.totalVideosGenerated
            : current.totalVideosGenerated + 1,
        totalViews:
          stats.totalViews !== undefined
            ? stats.totalViews
            : current.totalViews,
        totalLikes:
          stats.totalLikes !== undefined
            ? stats.totalLikes
            : current.totalLikes,
        updatedAt: new Date(),
      },
    });
  }

  // Get active series for automation
  async getActiveSeries(): Promise<UserSeries[]> {
    return this.prisma.userSeries.findMany({
      where: {
        isActive: true,
      },
      include: {
        user: {
          include: {
            userSubscriptions: {
              where: {
                status: 'active',
              },
              include: {
                plan: true,
              },
            },
          },
        },
        template: true,
      },
    });
  }

  // Delete series
  async deleteSeries(id: string): Promise<UserSeries> {
    return this.prisma.userSeries.delete({
      where: { id },
    });
  }
}
