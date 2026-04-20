import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { LogService } from './log.service';
import { Log } from 'src/logs/entities/log.entity';
import { AccountService } from 'src/accounts/services/account/account.service';
import { GoalsService } from 'src/goals/services/goals.service';

describe('LogService', () => {
  let service: LogService;
  let logRepository: jest.Mocked<Pick<Repository<Log>, 'createQueryBuilder'>>;

  beforeEach(async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    logRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        { provide: getRepositoryToken(Log), useValue: logRepository },
        { provide: JwtService, useValue: {} },
        {
          provide: AccountService,
          useValue: { findAccountById: jest.fn() },
        },
        {
          provide: GoalsService,
          useValue: { addProgressForMetric: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll applies mood predicate when mood and completedDate are set', async () => {
    await service.findAll({
      accountId: '1',
      completedDate: '2026-04-19',
      timeZone: 'America/New_York',
      mood: 'Calm',
    });

    const qb = logRepository.createQueryBuilder.mock.results[0]
      .value as ReturnType<typeof logRepository.createQueryBuilder>;
    expect(qb.andWhere).toHaveBeenCalledWith(
      'LOWER(TRIM(log.mood)) = LOWER(TRIM(:mood))',
      { mood: 'Calm' },
    );
  });
});
