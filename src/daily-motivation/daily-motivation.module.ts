import { Module } from '@nestjs/common';
import { DailyMotivationController } from './daily-motivation.controller';
import { DailyMotivationService } from './daily-motivation.service';

@Module({
  controllers: [DailyMotivationController],
  providers: [DailyMotivationService],
})
export class DailyMotivationModule {}
