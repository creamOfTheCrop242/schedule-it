import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { LogService } from 'src/logs/services/log/log.service';
import { serializeLogsForModel } from 'src/logs/utils/log-excerpts-for-model';

@Injectable()
export class LogInsightsService {
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
      return { summary: text };
    } catch (err: unknown) {
      if (err instanceof ServiceUnavailableException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : 'OpenAI request failed';
      throw new BadGatewayException(msg);
    }
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
