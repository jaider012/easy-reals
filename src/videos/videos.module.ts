import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VideosController],
})
export class VideosModule {}
