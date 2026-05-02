import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { DailyMotivationService } from './daily-motivation.service';

@Controller('daily-motivation')
export class DailyMotivationController {
  constructor(
    private readonly dailyMotivationService: DailyMotivationService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getDaily() {
    return this.dailyMotivationService.getDailyMotivation();
  }
}
