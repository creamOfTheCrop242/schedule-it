import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { LogVoiceService } from './log-voice.service';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
  toFile: jest.fn().mockResolvedValue({ mocked: true }),
}));

describe('LogVoiceService', () => {
  const MockedOpenAI = OpenAI as unknown as jest.Mock;
  let transcriptionCreateMock: jest.Mock;
  let responsesCreateMock: jest.Mock;

  beforeEach(() => {
    transcriptionCreateMock = jest.fn().mockResolvedValue({ text: ' I am feeling great today ' });
    responsesCreateMock = jest.fn().mockResolvedValue({
      output_text: JSON.stringify({
        name: 'Feeling grateful',
        mood: 'Happy',
        description: 'Said feeling great.',
        transcript: 'I am feeling great today',
      }),
    });

    MockedOpenAI.mockImplementation(
      () =>
        ({
          audio: {
            transcriptions: { create: transcriptionCreateMock },
          },
          responses: { create: responsesCreateMock },
        }) as unknown as OpenAI,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function createService(apiKey?: string): Promise<LogVoiceService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogVoiceService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'OPENAI_API_KEY') return apiKey ?? 'sk-test';
              return undefined;
            },
          },
        },
      ],
    }).compile();
    return module.get(LogVoiceService);
  }

  function audioFile(bytes = Buffer.from('fake')) {
    return {
      buffer: bytes,
      size: bytes.length,
      mimetype: 'audio/webm',
      originalname: 'rec.webm',
    } as Express.Multer.File;
  }

  it('throws when OPENAI_API_KEY missing', async () => {
    const svc = await createService('');
    await expect(svc.draftFromAudio(audioFile())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when transcription is empty', async () => {
    transcriptionCreateMock.mockResolvedValue({ text: '' });
    const svc = await createService();
    await expect(svc.draftFromAudio(audioFile())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('returns draft combining transcription + structured JSON', async () => {
    const svc = await createService();
    const draft = await svc.draftFromAudio(audioFile());

    expect(draft.name).toBe('Feeling grateful');
    expect(draft.mood).toBe('Happy');
    expect(draft.transcript.length).toBeGreaterThan(0);
    expect(transcriptionCreateMock).toHaveBeenCalledTimes(1);
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);

    const structInput = responsesCreateMock.mock.calls[0][0].input as string;
    expect(structInput).toContain('feeling great');
  });

  it('clamps invalid mood to Calm when model JSON omits whitelist', async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        name: 'X',
        mood: 'JoyfulBurst',
        description: 'd',
        transcript: 't',
      }),
    });

    const svc = await createService();
    const draft = await svc.draftFromAudio(audioFile());
    expect(draft.mood).toBe('Calm');
  });
});
