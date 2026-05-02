import { Test, TestingModule } from '@nestjs/testing';
import { PersonalGoalsController } from './personal-goals.controller';
import { PersonalGoalsService } from './personal-goals.service';

describe('PersonalGoalsController', () => {
  let controller: PersonalGoalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalGoalsController],
      providers: [
        {
          provide: PersonalGoalsService,
          useValue: {
            findAll: async () => [],
            create: async () => ({}),
            findOne: async () => ({}),
            update: async () => ({}),
            remove: async () => undefined,
          },
        },
      ],
    }).compile();

    controller = module.get(PersonalGoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
