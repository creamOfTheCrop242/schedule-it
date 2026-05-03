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
    const story = await this.fetchFromOpenAI(date);
    this.storyByUtcDay.set(date, story);
    return story;
  }

  private async fetchFromOpenAI(date: string): Promise<string> {
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
        input: DailyMotivationService.userPrompt(date),
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
      'Tell a public story of someone who faced long odds and succeeded.',
      'The user message assigns one broad geography for that UTC calendar day (deterministic rotation).',
      'Honor that geography for the protagonist’s primary setting and cultural context; vary era within it.',
      'Figures may include rulers, scholars, warriors, artists, inventors, explorers, reformers, athletes, activists, and others.',
      'Keep it between 250 and 400 words. Plain text only — no markdown code fences,',
      'no bullet lists unless essential. Short paragraphs.',
      'End with one blunt takeaway sentence the reader can apply today.',
      'Do not give medical or mental-health advice.',
    ].join(' ');
  }

  /** Stable hash from YYYY-MM-DD so each day maps to a broad world region (reduces model default skew). */
  static broadGeographyForUtcDate(date: string): string {
    // Order matters for consecutive UTC days (h % 7 drifts by one): keep the two
    // “Asian” buckets non-adjacent so readers rarely get South Asia then East Asia back-to-back.
    const regions = [
      'Africa',
      'Asia',
      'Europe',
      'North America',
      'South America',
      'Australia',
      'Antarctica',
    ];
    let h = 0;
    for (let i = 0; i < date.length; i++) {
      h = (h * 31 + date.charCodeAt(i)) >>> 0;
    }
    return regions[h % regions.length];
  }

  private static userPrompt(date: string): string {
    const geography = DailyMotivationService.broadGeographyForUtcDate(date);
    return [
      `Write today's piece for UTC calendar date ${date}.`,
      `Required geography for this day: **${geography}**.`,
      'Choose one well-documented overcoming-the-odds story (ancient through present) whose protagonist is',
      'primarily associated with that region — diaspora is fine if the arc is clearly rooted there.',
      'Pick a distinct era and figure type when you can; avoid the most overused global-meme picks.',
    ].join(' ');
  }
}
