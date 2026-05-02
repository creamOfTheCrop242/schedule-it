import { Test, TestingModule } from '@nestjs/testing';
import { DailyMotivationController } from './daily-motivation.controller';
import { DailyMotivationService } from './daily-motivation.service';

describe('DailyMotivationController', () => {
  let controller: DailyMotivationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DailyMotivationController],
      providers: [
        {
          provide: DailyMotivationService,
          useValue: {
            getDailyMotivation: async () => ({
              story: 'x',
              date: '2026-01-01',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<DailyMotivationController>(DailyMotivationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
