import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserService } from './user.service';
import { VideoService } from './video.service';
import { SeriesService } from './series.service';
import { SocialAccountService } from './social-account.service';

@Module({
  imports: [PrismaModule],
  providers: [UserService, VideoService, SeriesService, SocialAccountService],
  exports: [UserService, VideoService, SeriesService, SocialAccountService],
})
export class DatabaseModule {}
