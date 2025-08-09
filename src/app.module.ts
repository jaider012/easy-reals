import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { SeriesModule } from './series/series.module';
import { VideosModule } from './videos/videos.module';
import { SocialModule } from './social/social.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Core modules
    PrismaModule,
    DatabaseModule,

    // Feature modules
    AuthModule,
    UsersModule,
    SeriesModule,
    VideosModule,
    SocialModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
