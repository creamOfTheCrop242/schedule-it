import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DailyMotivationService } from './daily-motivation.service';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('DailyMotivationService', () => {
  const MockedOpenAI = OpenAI as unknown as jest.Mock;
  let createMock: jest.Mock;

  beforeEach(() => {
    createMock = jest.fn().mockResolvedValue({ output_text: '  STORY_BODY  ' });
    MockedOpenAI.mockImplementation(
      () =>
        ({
          responses: { create: createMock },
        }) as unknown as OpenAI,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function createService(): Promise<DailyMotivationService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyMotivationService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'OPENAI_API_KEY' ? 'sk-test' : undefined,
          },
        },
      ],
    }).compile();
    return module.get(DailyMotivationService);
  }

  it('returns utcDateKey as YYYY-MM-DD', () => {
    const d = new Date('2026-03-15T12:00:00.000Z');
    expect(DailyMotivationService.utcDateKey(d)).toBe('2026-03-15');
  });

  it('calls OpenAI only once per UTC day when cache is cold', async () => {
    const svc = await createService();
    const first = await svc.getDailyMotivation();
    const second = await svc.getDailyMotivation();
    expect(first.story).toBe('STORY_BODY');
    expect(second.story).toBe('STORY_BODY');
    expect(first.date).toBe(second.date);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
