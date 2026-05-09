import { ConfigService } from '@nestjs/config';
import OpenAI, { APIConnectionTimeoutError } from 'openai';
import type { Reasoning } from 'openai/resources/shared';
import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';

const REASONING_EFFORTS: ReadonlySet<string> = new Set([
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
]);

function reasoningOption(config: ConfigService): Reasoning | undefined {
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

function maxOutputTokensForSummary(config: ConfigService): number {
  const raw = config.get<string>('OPENAI_LOG_SUMMARY_MAX_OUTPUT_TOKENS')?.trim();
  const n = raw !== undefined && raw !== '' ? Number.parseInt(raw, 10) : 1200;
  if (!Number.isFinite(n)) {
    return 1200;
  }
  return Math.min(4096, Math.max(256, Math.floor(n)));
}

/**
 * Shared OpenAI Responses call for log summarization (on-demand or period batch).
 */
export async function summarizeLogsWithOpenAI(
  configService: ConfigService,
  instructions: string,
  input: string,
): Promise<{ text: string; model: string }> {
  const apiKey = configService.get<string>('OPENAI_API_KEY')?.trim();
  if (!apiKey) {
    throw new ServiceUnavailableException(
      'OpenAI is not configured (missing OPENAI_API_KEY).',
    );
  }

  const model =
    configService.get<string>('OPENAI_MODEL')?.trim() ?? 'gpt-5.5';
  const client = new OpenAI({ apiKey });
  const reasoning = reasoningOption(configService);
  const maxOutputTokens = maxOutputTokensForSummary(configService);

  try {
    const response = await client.responses.create({
      model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
      ...(reasoning ? { reasoning } : {}),
    });
    const text = response.output_text?.trim();
    if (!text) {
      throw new ServiceUnavailableException(
        'The model returned no text. Try again or check OPENAI_MODEL.',
      );
    }
    return { text, model };
  } catch (err: unknown) {
    if (err instanceof ServiceUnavailableException) {
      throw err;
    }
    if (err instanceof APIConnectionTimeoutError) {
      throw new ServiceUnavailableException(
        'The AI summary request timed out talking to OpenAI.',
      );
    }
    const msg = err instanceof Error ? err.message : 'OpenAI request failed';
    if (/timed?\s*out|timeout/i.test(msg)) {
      throw new ServiceUnavailableException('The AI summary took too long.');
    }
    throw new BadGatewayException(msg);
  }
}
