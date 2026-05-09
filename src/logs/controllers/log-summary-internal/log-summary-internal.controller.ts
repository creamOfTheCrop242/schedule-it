import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AccountService } from 'src/accounts/services/account/account.service';
import { LogPeriodSummaryGenerationService } from 'src/logs/services/log-period-summary/log-period-summary-generation.service';

/**
 * Optional trigger for Heroku Scheduler or ops (same work as the in-process cron).
 * Requires INTERNAL_CRON_SECRET and matching X-Internal-Cron-Secret header.
 */
@Controller('internal/log-summaries')
export class LogSummaryInternalController {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly generation: LogPeriodSummaryGenerationService,
  ) {}

  @Post('run')
  async run(
    @Headers('x-internal-cron-secret') secret: string | undefined,
  ): Promise<{ ok: boolean; accounts: number }> {
    const expected = this.configService.get<string>('INTERNAL_CRON_SECRET')?.trim();
    if (!expected || secret !== expected) {
      throw new UnauthorizedException();
    }
    const accounts = await this.accountService.listAccountsForSummaryJob();
    await this.generation.runDailySummariesForAllAccounts(accounts);
    return { ok: true, accounts: accounts.length };
  }
}
