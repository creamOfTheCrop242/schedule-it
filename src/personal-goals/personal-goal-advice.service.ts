import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { Log } from 'src/logs/entities/log.entity';
import { serializeLogsForModel } from 'src/logs/utils/log-excerpts-for-model';
import {
  PersonalGoalsService,
  PersonalGoalWithStats,
} from './personal-goals.service';

const COACHING_LOG_LIMIT = 50;

@Injectable()
export class PersonalGoalAdviceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly personalGoalsService: PersonalGoalsService,
  ) {}

  async coaching(
    goalId: string,
    accountId: string,
  ): Promise<{ advice: string }> {
    const goal = await this.personalGoalsService.findOne(goalId, accountId);
    const logs = await this.personalGoalsService.findLogsForPersonalGoal(
      goalId,
      accountId,
      { limit: COACHING_LOG_LIMIT, includeNotes: true },
    );

    if (logs.length === 0) {
      return {
        advice:
          'No logs are linked to this personal goal yet. Add or edit logs and assign this goal so there is activity to reflect on.',
      };
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured (missing OPENAI_API_KEY).',
      );
    }

    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ?? 'gpt-5.5';
    const input = PersonalGoalAdviceService.buildModelInput(goal, logs);
    const client = new OpenAI({ apiKey });

    try {
      const response = await client.responses.create({
        model,
        instructions: PersonalGoalAdviceService.instructions(),
        input,
      });
      const text = response.output_text?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'The model returned no text. Try again or check OPENAI_MODEL.',
        );
      }
      return { advice: text };
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
      'You coach a single user on progress toward one personal goal they defined in a productivity app.',
      'They attached journal-style activity logs to this goal. Read only what is in the prompt.',
      'Voice: channel the direct, extreme-accountability, no-excuses energy associated with',
      'David Goggins and Jocko Willink — aggressive and blunt, action-first.',
      'Do not claim to be either person, do not impersonate them.',
      'Explicit language is encouraged when it sharpens accountability; no slurs, no harassment, no hate.',
      'Call out where their log pattern matches or betrays the goal; name gaps and soft spots plainly.',
      'End with hard next moves they owe themselves this week — concrete, repeatable behaviors.',
      'Do not diagnose medical or mental-health conditions.',
      'Do not invent log content or facts not present in the excerpts.',
      'If excerpts are thin, say so in one line and still drop 2–3 brutal-but-doable demands.',
      'Plain text only — no Markdown code fences. Short paragraphs; bullets allowed.',
    ].join(' ');
  }

  private static buildModelInput(goal: PersonalGoalWithStats, logs: Log[]): string {
    const header: string[] = [
      'Personal goal (user-defined):',
      `Title: ${goal.title}`,
    ];
    if (goal.description) {
      header.push(`Description: ${goal.description}`);
    }
    if (goal.targetDate) {
      header.push(`Target date: ${goal.targetDate}`);
    }
    header.push('');
    header.push(serializeLogsForModel(logs));
    return header.join('\n');
  }
}
