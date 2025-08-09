import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialController],
})
export class SocialModule {}
