import {
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';

import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { Log } from 'src/logs/entities/log.entity';
import { LogPeriodSummary } from 'src/logs/entities/log-period-summary.entity';

interface AuthenticatedRequest extends Request {
  user: { id: string | number };
}

/**
 * Development-only: soft-delete all logs for the current account and remove
 * stored period summaries so onboarding guards see an empty log list.
 * Requires JWT cookie + X-Dev-Onboarding-Reset matching DEV_ONBOARDING_RESET_SECRET
 * and NODE_ENV is not production (local `nest start` often has no NODE_ENV).
 */
@Controller('internal/dev')
export class DevOnboardingSandboxController {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    @InjectRepository(LogPeriodSummary)
    private readonly logPeriodSummaryRepository: Repository<LogPeriodSummary>,
  ) {}

  @Post('reset-onboarding-sandbox')
  @UseGuards(JwtAuthGuard)
  async resetOnboardingSandbox(
    @Req() req: AuthenticatedRequest,
    @Headers('x-dev-onboarding-reset') secret: string | undefined,
  ): Promise<{ ok: true; logsSoftDeleted: number; summariesDeleted: number }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const expected = this.configService
      .get<string>('DEV_ONBOARDING_RESET_SECRET')
      ?.trim();
    if (!expected || !secret || secret !== expected) {
      throw new ForbiddenException();
    }

    const accountId = String(req.user.id);

    const softDeleteResult = await this.logRepository
      .createQueryBuilder()
      .update(Log)
      .set({ deletedAt: new Date() })
      .where('accountId = :accountId', { accountId })
      .andWhere('deletedAt IS NULL')
      .execute();

    const logsSoftDeleted =
      typeof softDeleteResult.affected === 'number' ? softDeleteResult.affected : 0;

    const del = await this.logPeriodSummaryRepository
      .createQueryBuilder()
      .delete()
      .from(LogPeriodSummary)
      .where('accountId = :accountId', { accountId })
      .execute();
    const summariesDeleted =
      typeof del.affected === 'number' ? del.affected : 0;

    return { ok: true, logsSoftDeleted, summariesDeleted };
  }
}
