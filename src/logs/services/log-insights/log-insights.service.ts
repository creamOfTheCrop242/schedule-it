import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { APIConnectionTimeoutError } from 'openai';
import type { Reasoning } from 'openai/resources/shared';

import { LogService } from 'src/logs/services/log/log.service';
import { serializeLogsForModel } from 'src/logs/utils/log-excerpts-for-model';

const REASONING_EFFORTS: ReadonlySet<string> = new Set([
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
]);

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

    const reasoning = LogInsightsService.reasoningOption(this.configService);
    const maxOutputTokens =
      LogInsightsService.maxOutputTokensForSummary(this.configService);

    try {
      const response = await client.responses.create({
        model,
        instructions: LogInsightsService.instructions(),
        input: logPayload,
        max_output_tokens: maxOutputTokens,
        ...(reasoning ? { reasoning } : {}),
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
      if (err instanceof APIConnectionTimeoutError) {
        throw new ServiceUnavailableException(
          'The AI summary request timed out talking to OpenAI. Try narrowing filters (date, search) or retry in a moment.',
        );
      }
      const msg = err instanceof Error ? err.message : 'OpenAI request failed';
      if (/timed?\s*out|timeout/i.test(msg)) {
        throw new ServiceUnavailableException(
          'The AI summary took too long. Try fewer logs in view (narrow filters) or retry shortly.',
        );
      }
      throw new BadGatewayException(msg);
    }
  }

  /**
   * Lower reasoning effort speeds up gpt-5.x style models (default would stay
   * at medium for many models). Set OPENAI_LOG_SUMMARY_REASONING_EFFORT=omit to
   * omit the field for models that reject `reasoning`.
   */
  private static reasoningOption(config: ConfigService): Reasoning | undefined {
    const raw = config
      .get<string>('OPENAI_LOG_SUMMARY_REASONING_EFFORT')
      ?.trim()
      .toLowerCase();
    if (raw === '' || raw === 'omit' || raw === 'off') {
      return undefined;
    }
    const effort = (raw ?? 'low').toLowerCase();
    if (!REASONING_EFFORTS.has(effort)) {
      return { effort: 'low' };
    }
    return { effort: effort as NonNullable<Reasoning['effort']> };
  }

  /** Caps completion length to keep latency predictable (default 1200). */
  private static maxOutputTokensForSummary(config: ConfigService): number {
    const raw = config.get<string>('OPENAI_LOG_SUMMARY_MAX_OUTPUT_TOKENS')?.trim();
    const n = raw !== undefined && raw !== '' ? Number.parseInt(raw, 10) : 1200;
    if (!Number.isFinite(n)) {
      return 1200;
    }
    return Math.min(4096, Math.max(256, Math.floor(n)));
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
