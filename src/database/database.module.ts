import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserService } from './user.service';
import { VideoService } from './video.service';
import { SeriesService } from './series.service';

@Module({
  imports: [PrismaModule],
  providers: [UserService, VideoService, SeriesService],
  exports: [UserService, VideoService, SeriesService],
})
export class DatabaseModule {}
