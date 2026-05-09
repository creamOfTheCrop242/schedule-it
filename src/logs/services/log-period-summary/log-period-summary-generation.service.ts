import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Account } from 'src/accounts/entities/account.entity';
import {
  LogPeriodSummary,
  type LogPeriodSummaryType,
} from 'src/logs/entities/log-period-summary.entity';
import { LogService } from 'src/logs/services/log/log.service';
import { baseLogSummaryInstructions } from 'src/logs/services/log-insights/log-insights.instructions';
import { summarizeLogsWithOpenAI } from 'src/logs/services/log-insights/log-summary-openai';
import { serializeLogsForModel } from 'src/logs/utils/log-excerpts-for-model';
import {
  isLastDayOfLocalMonthYmd,
  isLocalDec31Ymd,
  isLocalSundayYmd,
  localYesterdayYmd,
  monthPeriodKeyFromLocalYmd,
  utcRangeForLocalDay,
  utcRangeForLocalIsoWeekContaining,
  utcRangeForLocalMonthContaining,
  utcRangeForLocalYearContaining,
  yearPeriodKeyFromLocalYmd,
  isoWeekPeriodKeyFromLocalYmd,
} from 'src/logs/utils/log-period-boundaries';

const DISCLAIMER =
  'Note: Only the most recent logs in this period were included due to length limits.\n\n';

@Injectable()
export class LogPeriodSummaryGenerationService {
  private readonly logger = new Logger(LogPeriodSummaryGenerationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly logService: LogService,
    @InjectRepository(LogPeriodSummary)
    private readonly summaryRepository: Repository<LogPeriodSummary>,
  ) {}

  maxLogsPerRun(): number {
    const raw = this.configService
      .get<string>('LOG_PERIOD_SUMMARY_MAX_LOGS')
      ?.trim();
    const n = raw !== undefined && raw !== '' ? Number.parseInt(raw, 10) : 400;
    if (!Number.isFinite(n)) {
      return 400;
    }
    return Math.min(500, Math.max(50, Math.floor(n)));
  }

  /**
   * Daily rollup: yesterday’s day summary; on week/month/year boundaries, also
   * those periods (per plan).
   */
  async runDailySummariesForAllAccounts(accounts: Account[]): Promise<void> {
    const now = new Date();
    for (const account of accounts) {
      const tz = account.summaryTimeZone?.trim() || 'UTC';
      try {
        await this.runDailySummariesForAccount(String(account.id), tz, now);
      } catch (e) {
        this.logger.warn(
          `Period summary job failed for account ${account.id}: ${(e as Error).message}`,
        );
      }
    }
  }

  async runDailySummariesForAccount(
    accountId: string,
    tz: string,
    now: Date,
  ): Promise<void> {
    const ymd = localYesterdayYmd(now, tz);
    const dayKey = ymd;
    await this.tryGenerate(accountId, 'DAY', dayKey, tz, () =>
      utcRangeForLocalDay(dayKey, tz),
    );

    if (isLocalSundayYmd(ymd, tz)) {
      const weekKey = isoWeekPeriodKeyFromLocalYmd(ymd, tz);
      await this.tryGenerate(accountId, 'WEEK', weekKey, tz, () =>
        utcRangeForLocalIsoWeekContaining(ymd, tz),
      );
    }

    if (isLastDayOfLocalMonthYmd(ymd, tz)) {
      const monthKey = monthPeriodKeyFromLocalYmd(ymd);
      await this.tryGenerate(accountId, 'MONTH', monthKey, tz, () =>
        utcRangeForLocalMonthContaining(ymd, tz),
      );
    }

    if (isLocalDec31Ymd(ymd, tz)) {
      const yearKey = yearPeriodKeyFromLocalYmd(ymd);
      await this.tryGenerate(accountId, 'YEAR', yearKey, tz, () =>
        utcRangeForLocalYearContaining(ymd, tz),
      );
    }
  }

  private async tryGenerate(
    accountId: string,
    periodType: LogPeriodSummaryType,
    periodKey: string,
    tz: string,
    rangeFn: () => { startUtc: Date; endUtc: Date },
  ): Promise<void> {
    const existing = await this.summaryRepository.findOne({
      where: {
        account: { id: parseInt(accountId, 10) },
        periodType,
        periodKey,
      },
    });
    if (
      existing?.status === 'OK' &&
      existing.summary !== null &&
      existing.summary.trim().length > 0
    ) {
      return;
    }

    const { startUtc, endUtc } = rangeFn();
    const maxRows = this.maxLogsPerRun();
    const logs = await this.logService.findLogsForSummaryInUtcRange({
      accountId,
      startUtc,
      endUtc,
      maxRows: maxRows + 1,
    });

    const truncated = logs.length > maxRows;
    const slice = truncated ? logs.slice(0, maxRows) : logs;

    if (slice.length === 0) {
      await this.upsertRow(accountId, periodType, periodKey, {
        summary:
          'No logs in this period, so there is nothing to summarize yet.',
        status: 'OK',
        errorMessage: null,
        model: null,
      });
      return;
    }

    const intro = `Period: ${periodType} ${periodKey} (${tz}). Summarize patterns across these log excerpts.\n\n`;
    let payload = serializeLogsForModel(slice, intro);
    if (truncated) {
      payload = DISCLAIMER + payload;
    }

    const instructions = `${baseLogSummaryInstructions()} This is a closed ${periodType} rollup for the user’s journal.`;

    try {
      const { text, model } = await summarizeLogsWithOpenAI(
        this.configService,
        instructions,
        payload,
      );
      await this.upsertRow(accountId, periodType, periodKey, {
        summary: text,
        status: 'OK',
        errorMessage: null,
        model,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.upsertRow(accountId, periodType, periodKey, {
        summary: null,
        status: 'FAILED',
        errorMessage: msg.slice(0, 2000),
        model: null,
      });
      throw e;
    }
  }

  private async upsertRow(
    accountId: string,
    periodType: LogPeriodSummaryType,
    periodKey: string,
    body: {
      summary: string | null;
      status: 'OK' | 'FAILED';
      errorMessage: string | null;
      model: string | null;
    },
  ): Promise<void> {
    const idNum = parseInt(accountId, 10);
    let row = await this.summaryRepository.findOne({
      where: { account: { id: idNum }, periodType, periodKey },
    });
    if (!row) {
      row = this.summaryRepository.create({
        account: { id: idNum } as Account,
        periodType,
        periodKey,
        ...body,
      });
    } else {
      Object.assign(row, body);
    }
    await this.summaryRepository.save(row);
  }
}
