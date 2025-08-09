import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SocialAccount, Prisma } from '@prisma/client';

@Injectable()
export class SocialAccountService {
  constructor(private prisma: PrismaService) {}

  // Connect a new social account
  async connectAccount(data: {
    userId: string;
    platform: string;
    platformUserId: string;
    username: string;
    displayName?: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: Date;
    followerCount?: number;
    profileImageUrl?: string;
    isVerified?: boolean;
    autoPost?: boolean;
  }): Promise<SocialAccount> {
    return this.prisma.socialAccount.create({
      data: {
        ...data,
        connectedAt: new Date(),
      },
    });
  }

  // Get user's social accounts
  async getUserSocialAccounts(userId: string): Promise<SocialAccount[]> {
    return this.prisma.socialAccount.findMany({
      where: { userId },
      include: {
        socialPosts: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
      orderBy: {
        connectedAt: 'desc',
      },
    });
  }

  // Get social account by ID
  async getSocialAccountById(id: string): Promise<SocialAccount | null> {
    return this.prisma.socialAccount.findUnique({
      where: { id },
      include: {
        user: true,
        socialPosts: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    });
  }

  // Get social account by platform and user
  async getSocialAccountByPlatform(
    userId: string,
    platform: string,
  ): Promise<SocialAccount | null> {
    return this.prisma.socialAccount.findFirst({
      where: {
        userId,
        platform,
        isActive: true,
      },
    });
  }

  // Update social account
  async updateSocialAccount(
    id: string,
    data: Prisma.SocialAccountUpdateInput,
  ): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        ...data,
        lastSyncAt: new Date(),
      },
    });
  }

  // Update token information
  async updateTokens(
    id: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date,
  ): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        accessToken,
        refreshToken,
        tokenExpiresAt: expiresAt,
        lastSyncAt: new Date(),
      },
    });
  }

  // Update account metrics
  async updateAccountMetrics(
    id: string,
    metrics: {
      followerCount?: number;
      profileImageUrl?: string;
      isVerified?: boolean;
    },
  ): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        ...metrics,
        lastSyncAt: new Date(),
      },
    });
  }

  // Toggle account status
  async toggleAccountStatus(
    id: string,
    isActive: boolean,
  ): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        isActive,
        lastSyncAt: new Date(),
      },
    });
  }

  // Toggle auto-post setting
  async toggleAutoPost(id: string, autoPost: boolean): Promise<SocialAccount> {
    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        autoPost,
      },
    });
  }

  // Get active accounts for posting
  async getActiveAccountsForPosting(userId?: string) {
    return this.prisma.socialAccount.findMany({
      where: {
        ...(userId && { userId }),
        isActive: true,
        autoPost: true,
        // Check token expiration
        OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { gt: new Date() } }],
      },
      include: {
        user: true,
      },
    });
  }

  // Get accounts needing token refresh
  async getAccountsNeedingRefresh(): Promise<SocialAccount[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.socialAccount.findMany({
      where: {
        isActive: true,
        refreshToken: { not: null },
        tokenExpiresAt: {
          lt: tomorrow,
        },
      },
      include: {
        user: true,
      },
    });
  }

  // Get social account analytics
  async getAccountAnalytics(accountId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const account = await this.prisma.socialAccount.findUnique({
      where: { id: accountId },
      include: {
        socialPosts: {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!account) {
      return null;
    }

    // Calculate analytics
    const totalPosts = account.socialPosts.length;
    const totalViews = account.socialPosts.reduce(
      (sum, post) => sum + post.viewsCount,
      0,
    );
    const totalLikes = account.socialPosts.reduce(
      (sum, post) => sum + post.likesCount,
      0,
    );
    const totalComments = account.socialPosts.reduce(
      (sum, post) => sum + post.commentsCount,
      0,
    );
    const totalShares = account.socialPosts.reduce(
      (sum, post) => sum + post.sharesCount,
      0,
    );

    const avgEngagement =
      totalPosts > 0 && totalViews > 0
        ? ((totalLikes + totalComments + totalShares) / totalViews) * 100
        : 0;

    return {
      account: {
        id: account.id,
        platform: account.platform,
        username: account.username,
        followerCount: account.followerCount,
      },
      metrics: {
        totalPosts,
        totalViews,
        totalLikes,
        totalComments,
        totalShares,
        avgEngagementRate: avgEngagement,
        postsPerDay: days > 0 ? totalPosts / days : 0,
      },
      recentPosts: account.socialPosts.slice(0, 10).map((post) => ({
        id: post.id,
        caption: post.caption,
        publishedAt: post.publishedAt,
        viewsCount: post.viewsCount,
        likesCount: post.likesCount,
        engagementRate: Number(post.engagementRate),
      })),
    };
  }

  // Disconnect social account
  async disconnectAccount(id: string): Promise<SocialAccount> {
    return this.prisma.socialAccount.delete({
      where: { id },
    });
  }
}
