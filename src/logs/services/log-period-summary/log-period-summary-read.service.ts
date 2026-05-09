import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountService } from 'src/accounts/services/account/account.service';
import {
  LogPeriodSummary,
  type LogPeriodSummaryType,
} from 'src/logs/entities/log-period-summary.entity';
import { resolvePeriodKeyForAnchor } from 'src/logs/utils/log-period-boundaries';

@Injectable()
export class LogPeriodSummaryReadService {
  constructor(
    @InjectRepository(LogPeriodSummary)
    private readonly summaryRepository: Repository<LogPeriodSummary>,
    private readonly accountService: AccountService,
  ) {}

  async getSummaryForAnchor(options: {
    accountId: string;
    periodType: LogPeriodSummaryType;
    anchorYmd: string;
    /** When account has no stored TZ yet, use this (client IANA). */
    timeZoneFallback: string;
  }): Promise<LogPeriodSummary> {
    const account = await this.accountService.findAccountById(options.accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const tz =
      account.summaryTimeZone?.trim() ||
      options.timeZoneFallback.trim() ||
      'UTC';
    const periodKey = resolvePeriodKeyForAnchor(
      options.periodType,
      options.anchorYmd,
      tz,
    );
    const row = await this.summaryRepository.findOne({
      where: {
        account: { id: parseInt(options.accountId, 10) },
        periodType: options.periodType,
        periodKey,
      },
    });
    if (!row) {
      throw new NotFoundException(
        `No stored summary for ${options.periodType} ${periodKey} yet.`,
      );
    }
    return row;
  }
}
