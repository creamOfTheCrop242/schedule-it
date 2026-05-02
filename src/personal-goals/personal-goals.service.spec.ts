import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Log } from 'src/logs/entities/log.entity';
import { PersonalGoal } from './entities/personal-goal.entity';
import { PersonalGoalsService } from './personal-goals.service';

describe('PersonalGoalsService', () => {
  let service: PersonalGoalsService;
  let goalRepo: Record<string, jest.Mock>;
  let logRepo: { createQueryBuilder: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    goalRepo = {
      findOne: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      softDelete: jest.fn(),
      find: jest.fn(),
    };
    logRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonalGoalsService,
        { provide: getRepositoryToken(PersonalGoal), useValue: goalRepo },
        { provide: getRepositoryToken(Log), useValue: logRepo },
        {
          provide: AccountService,
          useValue: { findAccountById: jest.fn(async () => ({ id: 1 })) },
        },
      ],
    }).compile();

    service = module.get(PersonalGoalsService);
  });

  it('resolvePersonalGoalForWrite returns null when id empty', async () => {
    await expect(
      service.resolvePersonalGoalForWrite('', '1'),
    ).resolves.toBeNull();
    expect(goalRepo.findOne).not.toHaveBeenCalled();
  });

  it('resolvePersonalGoalForWrite loads goal for account', async () => {
    const g = { id: 'g1', title: 'T', account: { id: 1 } } as PersonalGoal;
    (goalRepo.findOne as jest.Mock).mockResolvedValue(g);
    await expect(
      service.resolvePersonalGoalForWrite('g1', '1'),
    ).resolves.toEqual(g);
  });

  it('findLogsForPersonalGoal returns logs when goal exists', async () => {
    const g = { id: 'g1', title: 'T' } as PersonalGoal;
    (goalRepo.findOne as jest.Mock).mockResolvedValue(g);
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    (logRepo.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    const logRow = { id: 'l1', name: 'A log' } as unknown as Log;
    (logRepo.find as jest.Mock).mockResolvedValue([logRow]);
    await expect(service.findLogsForPersonalGoal('g1', '1')).resolves.toEqual([
      logRow,
    ]);
    expect(logRepo.find).toHaveBeenCalled();
  });
});
