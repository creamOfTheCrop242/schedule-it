import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoalDefinition } from '../entities/goal-definition.entity';
import { GoalProgress } from '../entities/goal-progress.entity';
import { GoalsService } from './goals.service';

describe('GoalsService', () => {
  let service: GoalsService;
  let defsRepo: Repository<GoalDefinition>;
  let progressRepo: Repository<GoalProgress>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        { provide: getRepositoryToken(GoalDefinition), useValue: {} },
        { provide: getRepositoryToken(GoalProgress), useValue: {} },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    defsRepo = module.get(getRepositoryToken(GoalDefinition));
    progressRepo = module.get(getRepositoryToken(GoalProgress));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(defsRepo).toBeDefined();
    expect(progressRepo).toBeDefined();
  });
});
