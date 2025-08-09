import { Module } from '@nestjs/common';
import { SeriesController } from './series.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SeriesController],
})
export class SeriesModule {}
