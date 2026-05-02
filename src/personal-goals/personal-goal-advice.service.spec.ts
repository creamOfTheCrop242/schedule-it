import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Log } from 'src/logs/entities/log.entity';
import { PersonalGoalAdviceService } from './personal-goal-advice.service';
import { PersonalGoalsService } from './personal-goals.service';

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('PersonalGoalAdviceService', () => {
  const MockedOpenAI = OpenAI as unknown as jest.Mock;
  let createMock: jest.Mock;
  let personalGoalsService: {
    findOne: jest.Mock;
    findLogsForPersonalGoal: jest.Mock;
  };

  beforeEach(() => {
    createMock = jest.fn().mockResolvedValue({ output_text: '  COACH_BODY  ' });
    MockedOpenAI.mockImplementation(
      () =>
        ({
          responses: { create: createMock },
        }) as unknown as OpenAI,
    );
    personalGoalsService = {
      findOne: jest.fn().mockResolvedValue({
        id: 'g1',
        title: 'Run a 5K',
        description: 'Train steady',
        targetDate: '2026-06-01',
        linkedLogCount: 1,
      }),
      findLogsForPersonalGoal: jest.fn().mockResolvedValue([
        { id: 'l1', name: 'Easy jog', notes: [] } as Log,
      ]),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function createService(): Promise<PersonalGoalAdviceService> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalGoalAdviceService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'OPENAI_API_KEY' ? 'sk-test' : undefined,
          },
        },
        { provide: PersonalGoalsService, useValue: personalGoalsService },
      ],
    }).compile();
    return module.get(PersonalGoalAdviceService);
  }

  it('returns fixed message without calling OpenAI when no logs', async () => {
    personalGoalsService.findLogsForPersonalGoal.mockResolvedValue([]);
    const svc = await createService();
    const out = await svc.coaching('g1', '1');
    expect(out.advice).toContain('No logs are linked');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('calls OpenAI with goal title and log title when logs exist', async () => {
    const svc = await createService();
    const out = await svc.coaching('g1', '1');
    expect(out.advice).toBe('COACH_BODY');
    expect(createMock).toHaveBeenCalledTimes(1);
    const input = createMock.mock.calls[0][0].input as string;
    expect(input).toContain('Run a 5K');
    expect(input).toContain('Easy jog');
  });
});
