import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { Log } from 'src/logs/entities/log.entity';
import { LogService } from 'src/logs/services/log/log.service';

/** Max characters per textual field when building the model input. */
const TRUNCATION = 500;

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
    const logPayload = LogInsightsService.serializeLogs(logs);
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
      'Keep a tonesimiliar to david goggins and jocko willink. Be aggressive and direct.',
      'You may use short bullet points.',
      'Do not diagnose medical or mental-health conditions.',
      'Do not claim certainty about facts not present in the logs.',
      'If the excerpts are sparse, say so briefly and still offer gentle observations.',
      'Respond in plain text only (no Markdown code fences).',
    ].join(' ');
  }

  private static clip(value: string | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    const s = String(value).trim();
    if (s.length <= TRUNCATION) {
      return s;
    }
    return `${s.slice(0, TRUNCATION)}…`;
  }

  private static serializeLogs(logs: Log[]): string {
    const lines: string[] = ['Log excerpts (most recent slice first):\n'];

    let index = 0;
    for (const log of logs) {
      index += 1;
      lines.push(`--- Log ${index} ---`);

      lines.push(`Title: ${LogInsightsService.clip(log.name) || '(no title)'}`);

      if (log.completedDate) {
        lines.push(
          `Completed: ${log.completedDate instanceof Date ? log.completedDate.toISOString() : String(log.completedDate)}`,
        );
      }
      if (log.mood) {
        lines.push(`Mood: ${LogInsightsService.clip(log.mood)}`);
      }
      if (log.category) {
        lines.push(`Category: ${LogInsightsService.clip(log.category)}`);
      }
      const desc = LogInsightsService.clip(log.description);
      if (desc) {
        lines.push(`Description: ${desc}`);
      }
      const sur = LogInsightsService.clip(log.surroundings);
      if (sur) {
        lines.push(`Surroundings: ${sur}`);
      }

      const habitName = log.habit?.name;
      if (habitName) {
        lines.push(`Habit: ${LogInsightsService.clip(habitName)}`);
      }

      const notes = log.notes ?? [];
      if (notes.length > 0) {
        lines.push('Notes:');
        for (const note of notes) {
          lines.push(`- ${LogInsightsService.clip(note?.content)}`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}
