import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  AddProgressDto,
  GoalMetric,
  SubtractProgressDto,
  UpsertGoalDto,
} from '../goals.model';
import { GoalsService } from '../services/goals.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';

@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async upsertGoal(@Req() req, @Body() body: UpsertGoalDto) {
    const accountId = req.user.id;

    return this.goalsService.upsertGoal(
      accountId,
      body.metric,
      body.scope,
      body.targetValue,
      body.filters,
    );
  }

  // ---------------------------------------------------------------------------
  // 📊 Get current status for a metric (all scopes: day/week/month/year)
  // GET /goals/status?metric=LOGS_COMPLETED
  // ---------------------------------------------------------------------------
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req, @Query('metric') metric: GoalMetric) {
    const userId = req.user.id;

    const status = await this.goalsService.getCurrentStatus(userId, metric);
    return status;
  }

  // ---------------------------------------------------------------------------
  // ➕ Add progress for a metric (e.g., complete a log)
  // POST /goals/progress/add
  // Body: { metric, amount, at? }
  // ---------------------------------------------------------------------------
  @Post('progress/add')
  @UseGuards(JwtAuthGuard)
  async addProgress(@Req() req, @Body() body: AddProgressDto) {
    const userId = req.user.id;
    const at = body.at ? new Date(body.at) : new Date();

    await this.goalsService.addProgressForMetric(
      userId,
      body.metric,
      body.amount,
      at,
    );

    return { success: true };
  }

  @Post('progress/subtract')
  @UseGuards(JwtAuthGuard)
  async subtractProgress(@Req() req, @Body() body: SubtractProgressDto) {
    const userId = req.user.id;
    const at = body.at ? new Date(body.at) : new Date();

    await this.goalsService.subtractProgressForMetric(
      userId,
      body.metric,
      body.amount,
      at,
    );

    return { success: true };
  }
}
