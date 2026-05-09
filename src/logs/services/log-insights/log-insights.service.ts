import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LogService } from 'src/logs/services/log/log.service';
import { baseLogSummaryInstructions } from 'src/logs/services/log-insights/log-insights.instructions';
import { summarizeLogsWithOpenAI } from 'src/logs/services/log-insights/log-summary-openai';
import { serializeLogsForModel } from 'src/logs/utils/log-excerpts-for-model';

@Injectable()
export class LogInsightsService {
  /** Per-account last successful OpenAI summary (in-process; resets on deploy / multi-instance drift). */
  private static readonly lastAiSummarySuccessAt = new Map<string, number>();
  private static readonly AI_SUMMARY_COOLDOWN_MS = 5 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly logService: LogService,
  ) {}

  async summarize(
    accountId: string,
    filters: {
      completedDate?: string;
      status?: string;
      timeZone?: string;
      mood?: string;
      category?: string;
      search?: string;
    },
  ): Promise<{ summary: string }> {
    const logs = await this.logService.findAll({
      ...filters,
      accountId,
      limit: '50',
      offset: '0',
    });

    if (logs.length === 0) {
      return {
        summary:
          'No logs match the current filters, so there is nothing to summarize.',
      };
    }

    LogInsightsService.assertAiSummaryCooldown(accountId);

    const logPayload = serializeLogsForModel(logs);
    const { text } = await summarizeLogsWithOpenAI(
      this.configService,
      baseLogSummaryInstructions(),
      logPayload,
    );
    LogInsightsService.lastAiSummarySuccessAt.set(accountId, Date.now());
    return { summary: text };
  }

  private static assertAiSummaryCooldown(accountId: string): void {
    const last = LogInsightsService.lastAiSummarySuccessAt.get(accountId);
    if (last === undefined) {
      return;
    }
    const elapsed = Date.now() - last;
    if (elapsed >= LogInsightsService.AI_SUMMARY_COOLDOWN_MS) {
      return;
    }
    const retryAfterSec = Math.ceil(
      (LogInsightsService.AI_SUMMARY_COOLDOWN_MS - elapsed) / 1000,
    );
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `AI summary can be run once every 5 minutes. Try again in ${retryAfterSec} seconds.`,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

}
