import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

import { LOG_MOOD_PRESETS, MOOD_PRESET_SET } from 'src/logs/constants/mood-presets';

export interface VoiceLogDraftDto {
  name: string;
  mood: string;
  description: string;
  transcript: string;
}

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

/**
 * Whisper transcribes arbitrary browser uploads (WebM/opus, etc.).
 * Responses API structures title/mood/description from transcript (wording-based mood).
 */
@Injectable()
export class LogVoiceService {
  constructor(private readonly configService: ConfigService) {}

  async draftFromAudio(file: Express.Multer.File): Promise<VoiceLogDraftDto> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Missing audio file.');
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new BadRequestException(
        `Audio must be under ${MAX_AUDIO_BYTES / (1024 * 1024)} MB.`,
      );
    }
    if (!file.mimetype?.startsWith('audio/')) {
      throw new BadRequestException(
        'Invalid file type. Upload an audio recording.',
      );
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI is not configured (missing OPENAI_API_KEY).',
      );
    }

    const client = new OpenAI({ apiKey });
    const model =
      this.configService.get<string>('OPENAI_VOICE_LOG_MODEL')?.trim() ??
      'gpt-4o-mini';

    let transcript: string;
    try {
      const audioFile = await toFile(
        file.buffer,
        file.originalname ?? 'recording.webm',
        { type: file.mimetype },
      );
      const tr = await client.audio.transcriptions.create({
        file: audioFile,
        model: this.transcriptionModel(),
      });
      const text =
        typeof tr === 'string'
          ? tr
          : (tr as { text?: string }).text ?? '';
      transcript = text.trim();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Transcription failed';
      throw new BadGatewayException(msg);
    }

    if (!transcript) {
      throw new BadRequestException(
        'Could not understand any speech in the recording. Try again closer to the mic.',
      );
    }

    const moodList = LOG_MOOD_PRESETS.join(', ');
    const instructions = [
      'You help fill a personal activity log entry from transcribed speech.',
      'Return JSON only matching the requested schema.',
      `The user's spoken words are already transcribed to text.`,
      `Choose mood as exactly one label from this list (match spelling): ${moodList}. Infer mood from wording and expressed emotion in that transcript.`,
      'name: short actionable log title (max ~80 chars).',
      'description: a concise journal paragraph capturing what they said; may lightly clean filler words.',
      `transcript: repeat the supplied transcript verbatim (do not invent speech).`,
    ].join(' ');

    try {
      const response = await client.responses.create({
        model,
        instructions,
        input: JSON.stringify({
          task: 'structure_voice_log_draft',
          transcript,
        }),
        text: {
          format: {
            type: 'json_schema',
            name: 'voice_log_draft',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string' },
                mood: { type: 'string', enum: [...LOG_MOOD_PRESETS] },
                description: { type: 'string' },
                transcript: { type: 'string' },
              },
              required: ['name', 'mood', 'description', 'transcript'],
            },
          },
        },
      });

      const raw = response.output_text?.trim();
      if (!raw) {
        throw new ServiceUnavailableException(
          'The model returned no text. Try again or check OPENAI_VOICE_LOG_MODEL.',
        );
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        throw new BadGatewayException('Model returned invalid JSON.');
      }

      let mood = typeof parsed.mood === 'string' ? parsed.mood.trim() : '';
      if (!MOOD_PRESET_SET.has(mood)) {
        mood = 'Calm';
      }

      return {
        name:
          typeof parsed.name === 'string' && parsed.name.trim().length > 0
            ? parsed.name.trim()
            : transcript.slice(0, 80).trim(),
        mood,
        description:
          typeof parsed.description === 'string' && parsed.description.trim()
            ? parsed.description.trim()
            : transcript,
        transcript:
          typeof parsed.transcript === 'string' && parsed.transcript.trim()
            ? parsed.transcript.trim()
            : transcript,
      };
    } catch (err: unknown) {
      if (
        err instanceof ServiceUnavailableException ||
        err instanceof BadRequestException ||
        err instanceof BadGatewayException
      ) {
        throw err;
      }
      const msg =
        err instanceof Error ? err.message : 'OpenAI structuring failed';
      throw new BadGatewayException(msg);
    }
  }

  private transcriptionModel(): string {
    return (
      this.configService.get<string>('OPENAI_TRANSCRIPTION_MODEL')?.trim() ??
      'whisper-1'
    );
  }
}
