import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { IsNull, Repository } from 'typeorm';

import { Account } from 'src/accounts/entities/account.entity';
import { AccountService } from 'src/accounts/services/account/account.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { Log } from 'src/logs/entities/log.entity';

interface AuthenticatedRequest extends Request {
  user: { id: string | number };
}

const SELF_ADMIN_EMAIL = 'dhudson0242@gmail.com';

@Controller('internal/admin')
export class InternalAdminController {
  constructor(
    private readonly accountService: AccountService,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
  ) {}

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async dashboard(@Req() req: AuthenticatedRequest): Promise<{
    totalAccounts: number;
    accounts: Array<{
      email: string;
      lastActivityAt: string; // ISO
    }>;
  }> {
    const me = await this.accountService.getCurrentUser(req.user.id);
    if (me.email?.toLowerCase() !== SELF_ADMIN_EMAIL) {
      throw new ForbiddenException('Not authorized.');
    }

    const totalAccounts = await this.accountRepository.count({
      where: { deletedAt: IsNull() },
    });

    const accounts = await this.accountRepository.find({
      where: { deletedAt: IsNull() },
      select: ['id', 'email', 'createdAt'],
    });

    const accountsWithActivity = await Promise.all(
      accounts.map(async (a) => {
        // TypeORM can generate invalid DISTINCT queries for findOne+order+select
        // when the select does not include the primary key. Use an explicit query.
        const last = await this.logRepository
          .createQueryBuilder('log')
          .select('log.createdAt', 'createdAt')
          .where('log.accountId = :accountId', { accountId: a.id })
          .andWhere('log.deletedAt IS NULL')
          .orderBy('log.createdAt', 'DESC')
          .limit(1)
          .getRawOne<{ createdAt: Date }>();

        const lastActivityAt = (last?.createdAt ?? a.createdAt).toISOString();

        return {
          email: a.email,
          lastActivityAt,
        };
      }),
    );

    // Sort newest activity first.
    accountsWithActivity.sort(
      (x, y) => y.lastActivityAt.localeCompare(x.lastActivityAt),
    );

    return {
      totalAccounts,
      accounts: accountsWithActivity,
    };
  }
}

