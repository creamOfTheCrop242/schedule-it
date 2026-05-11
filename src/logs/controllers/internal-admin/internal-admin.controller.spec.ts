import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InternalAdminController } from './internal-admin.controller';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Account } from 'src/accounts/entities/account.entity';
import { Log } from 'src/logs/entities/log.entity';

describe('InternalAdminController', () => {
  let controller: InternalAdminController;
  let accountService: { getCurrentUser: jest.Mock };
  let accountRepo: { count: jest.Mock; find?: jest.Mock };
  let logRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    accountService = { getCurrentUser: jest.fn() };
    accountRepo = { count: jest.fn(), find: jest.fn() };
    logRepo = { createQueryBuilder: jest.fn() };

    const mod = await Test.createTestingModule({
      controllers: [InternalAdminController],
      providers: [
        { provide: AccountService, useValue: accountService },
        { provide: getRepositoryToken(Account), useValue: accountRepo },
        { provide: getRepositoryToken(Log), useValue: logRepo },
      ],
    }).compile();

    controller = mod.get(InternalAdminController);
  });

  it('throws for non-allowed email', async () => {
    accountService.getCurrentUser.mockResolvedValue({ email: 'nope@example.com' });
    await expect(
      controller.dashboard({ user: { id: 1 } } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns counts and last log for allowed email', async () => {
    accountService.getCurrentUser.mockResolvedValue({ email: 'dhudson0242@gmail.com' });
    accountRepo.count.mockResolvedValue(12);
    accountRepo.find = jest.fn().mockResolvedValue([
      {
        id: 1,
        email: 'a@example.com',
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
      },
      {
        id: 2,
        email: 'b@example.com',
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      },
    ]);

    const getRawOne = jest
      .fn()
      .mockResolvedValueOnce({ createdAt: new Date('2026-05-02T10:00:00.000Z') })
      .mockResolvedValueOnce(null);

    const qb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne,
    };
    logRepo.createQueryBuilder.mockReturnValue(qb);

    const res = await controller.dashboard({ user: { id: 1 } } as any);
    expect(res.totalAccounts).toBe(12);
    expect(res.accounts).toHaveLength(2);
    expect(res.accounts[0]).toEqual({
      email: 'a@example.com',
      lastActivityAt: '2026-05-02T10:00:00.000Z',
    });
    expect(res.accounts[1]).toEqual({
      email: 'b@example.com',
      lastActivityAt: '2026-04-01T10:00:00.000Z',
    });
  });
});

