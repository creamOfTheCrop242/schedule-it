import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * Cache key is UTC calendar date (YYYY-MM-DD) so every user receives the same
 * story for that server day. Local midnight vs UTC is a known tradeoff.
 */
@Injectable()
export class DailyMotivationService {
  private readonly storyByUtcDay = new Map<string, string>();
  private readonly inFlightByUtcDay = new Map<string, Promise<string>>();

  constructor(private readonly configService: ConfigService) {}

  static utcDateKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async getDailyMotivation(): Promise<{ story: string; date: string }> {
    const date = DailyMotivationService.utcDateKey(new Date());
    const cached = this.storyByUtcDay.get(date);
    if (cached) {
      return { story: cached, date };
    }

    let flight = this.inFlightByUtcDay.get(date);
    if (!flight) {
      flight = this.generateAndStore(date);
      this.inFlightByUtcDay.set(date, flight);
    }

    try {
      const story = await flight;
      return { story, date };
    } finally {
      this.inFlightByUtcDay.delete(date);
    }
  }

  private async generateAndStore(date: string): Promise<string> {
    const story = await this.fetchFromOpenAI();
    this.storyByUtcDay.set(date, story);
    return story;
  }

  private async fetchFromOpenAI(): Promise<string> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured (missing OPENAI_API_KEY).',
      );
    }

    const model =
      this.configService.get<string>('OPENAI_MODEL')?.trim() ?? 'gpt-5.5';
    const client = new OpenAI({ apiKey });

    try {
      const response = await client.responses.create({
        model,
        instructions: DailyMotivationService.instructions(),
        input: DailyMotivationService.userPrompt(),
      });
      const text = response.output_text?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'The model returned no text. Try again or check OPENAI_MODEL.',
        );
      }
      return text;
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
      'You write a single motivational piece for a productivity app dashboard.',
      'Voice: extreme accountability, discipline, ownership, no excuses.',
      'Channel the direct, repetitive, action-first energy associated with',
      'David Goggins and Jocko Willink — but do not claim to be either person,',
      'do not impersonate them, and do not use slurs or harassment.',
      'Tell a true or very well-known public story of someone who faced long odds',
      'and succeeded. Subjects must span all of human history — ancient through modern,',
      'every region and civilization (not only recent Western figures): rulers, scholars,',
      'warriors, artists, inventors, explorers, reformers, athletes, activists, and others.',
      'Rotate eras and geographies across days; do not default to the same century or culture.',
      'Keep it between 250 and 400 words. Plain text only — no markdown code fences,',
      'no bullet lists unless essential. Short paragraphs.',
      'End with one blunt takeaway sentence the reader can apply today.',
      'Do not give medical or mental-health advice.',
    ].join(' ');
  }

  private static userPrompt(): string {
    return (
      'Write today’s piece. Choose one well-documented overcoming-the-odds story from ' +
      'any era of human history (ancient through present), any part of the world. ' +
      'Avoid repeating the same narrow type of figure or time period as generic daily picks.'
    );
  }
}
