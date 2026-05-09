import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { AccountService } from 'src/accounts/services/account/account.service';
import { LogPeriodSummaryGenerationService } from 'src/logs/services/log-period-summary/log-period-summary-generation.service';

@Injectable()
export class LogPeriodSummaryCronService {
  private readonly logger = new Logger(LogPeriodSummaryCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly generation: LogPeriodSummaryGenerationService,
  ) {}

  /**
   * Default 10:00 UTC daily. Override with SUMMARY_CRON_EXPRESSION (5-field cron).
   * Disabled unless SUMMARY_CRON_ENABLED=true.
   */
  @Cron(process.env.SUMMARY_CRON_EXPRESSION ?? '0 10 * * *')
  async runScheduledPeriodSummaries(): Promise<void> {
    if (this.configService.get<string>('SUMMARY_CRON_ENABLED') !== 'true') {
      return;
    }
    this.logger.log('Starting daily log period summary job…');
    const accounts = await this.accountService.listAccountsForSummaryJob();
    await this.generation.runDailySummariesForAllAccounts(accounts);
    this.logger.log(
      `Finished daily log period summary job (${accounts.length} accounts).`,
    );
  }
}
