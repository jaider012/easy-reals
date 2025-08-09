import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Profile, Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  // Create a new user profile
  async createProfile(data: {
    id: string; // Supabase auth user ID
    email: string;
    fullName?: string;
    avatarUrl?: string;
    businessName?: string;
    businessType?: string;
  }): Promise<Profile> {
    return this.prisma.profile.create({
      data,
    });
  }

  // Find user by ID
  async findProfileById(id: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { id },
      include: {
        userSubscriptions: {
          include: {
            plan: true,
          },
        },
        userSeries: true,
        socialAccounts: true,
      },
    });
  }

  // Find user by email
  async findProfileByEmail(email: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { email },
      include: {
        userSubscriptions: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  // Update user profile
  async updateProfile(
    id: string,
    data: Prisma.ProfileUpdateInput,
  ): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  // Update last login
  async updateLastLogin(id: string): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  // Get user with full analytics
  async getProfileWithAnalytics(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
      include: {
        userSubscriptions: {
          include: {
            plan: true,
          },
        },
        userSeries: {
          include: {
            videos: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 10,
            },
          },
        },
        analyticsDaily: {
          orderBy: {
            date: 'desc',
          },
          take: 30,
        },
        socialAccounts: true,
        videos: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  // Delete user profile (soft delete by setting isActive to false)
  async deactivateProfile(id: string): Promise<Profile> {
    return this.prisma.profile.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }
}
