import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DevOnboardingSandboxController } from './dev-onboarding-sandbox.controller';
import { Log } from 'src/logs/entities/log.entity';
import { LogPeriodSummary } from 'src/logs/entities/log-period-summary.entity';

describe('DevOnboardingSandboxController', () => {
  let controller: DevOnboardingSandboxController;
  let config: ConfigService;
  let logRepo: jest.Mocked<Pick<Repository<Log>, 'createQueryBuilder'>>;
  let summaryRepo: jest.Mocked<Pick<Repository<LogPeriodSummary>, 'createQueryBuilder'>>;
  let summaryDeleteQb: {
    delete: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };

  const prevNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    process.env.NODE_ENV = prevNodeEnv;
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'development';

    const qbExecute = jest.fn().mockResolvedValue({ affected: 2 });
    const qbChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: qbExecute,
    };
    logRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qbChain),
    };

    summaryDeleteQb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 3, raw: [] }),
    };
    summaryRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(summaryDeleteQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevOnboardingSandboxController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'DEV_ONBOARDING_RESET_SECRET' ? 'secret-xyz' : undefined,
            ),
          },
        },
        { provide: getRepositoryToken(Log), useValue: logRepo },
        {
          provide: getRepositoryToken(LogPeriodSummary),
          useValue: summaryRepo,
        },
      ],
    }).compile();

    controller = module.get(DevOnboardingSandboxController);
    config = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when NODE_ENV is production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(
      controller.resetOnboardingSandbox(
        { user: { id: 'acc-1' } } as never,
        'secret-xyz',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    process.env.NODE_ENV = 'development';
  });

  it('throws when DEV_ONBOARDING_RESET_SECRET is unset', async () => {
    jest.spyOn(config, 'get').mockReturnValue(undefined);
    await expect(
      controller.resetOnboardingSandbox(
        { user: { id: 'acc-1' } } as never,
        'secret-xyz',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when header secret is missing or wrong', async () => {
    await expect(
      controller.resetOnboardingSandbox(
        { user: { id: 'acc-1' } } as never,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      controller.resetOnboardingSandbox(
        { user: { id: 'acc-1' } } as never,
        'wrong',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft-deletes logs and deletes summaries for current user', async () => {
    const result = await controller.resetOnboardingSandbox(
      { user: { id: 'uuid-99' } } as never,
      'secret-xyz',
    );

    expect(result).toEqual({
      ok: true,
      logsSoftDeleted: 2,
      summariesDeleted: 3,
    });

    expect(logRepo.createQueryBuilder).toHaveBeenCalled();
    expect(summaryRepo.createQueryBuilder).toHaveBeenCalled();
    expect(summaryDeleteQb.where).toHaveBeenCalledWith(
      'accountId = :accountId',
      { accountId: 'uuid-99' },
    );
  });
});
