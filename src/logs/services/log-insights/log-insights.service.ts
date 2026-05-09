import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { LogService } from 'src/logs/services/log/log.service';
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
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured (missing OPENAI_API_KEY).',
      );
    }

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

    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ?? 'gpt-5.5';
    const logPayload = serializeLogsForModel(logs);
    const client = new OpenAI({ apiKey });

    try {
      const response = await client.responses.create({
        model,
        instructions: LogInsightsService.instructions(),
        input: logPayload,
      });
      const text = response.output_text?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'The model returned no text. Try again or check OPENAI_MODEL.',
        );
      }
      LogInsightsService.lastAiSummarySuccessAt.set(accountId, Date.now());
      return { summary: text };
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : 'OpenAI request failed';
      throw new BadGatewayException(msg);
    }
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

  private static instructions(): string {
    return [
      "You summarize a single user's personal activity logs (journal-style entries).",
      'Keep a tone similiar to david goggins and jocko willink. Be aggressive and direct.',
      'explicit language is encouraged',
      'You may use short bullet points.',
      'Do not diagnose medical or mental-health conditions.',
      'Do not claim certainty about facts not present in the logs.',
      'If the excerpts are sparse, say so briefly and still offer gentle observations.',
      'Respond in plain text only (no Markdown code fences).',
    ].join(' ');
  }

}
