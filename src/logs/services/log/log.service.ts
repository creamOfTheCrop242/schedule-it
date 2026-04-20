import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { AccountService } from 'src/accounts/services/account/account.service';
import { Log } from 'src/logs/entities/log.entity';
import { CreateLogDto, UpdateLogDto } from 'src/logs/models/logs.model';
import { GoalsService } from 'src/goals/services/goals.service';
import { GoalMetric } from 'src/goals/goals.model';

@Injectable()
export class LogService {
  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly jwtService: JwtService,
    private readonly accountService: AccountService,
    private readonly goalsService: GoalsService,
  ) {}

  async create(createLogDto: CreateLogDto, accountId: string): Promise<Log> {
    const { dependencyLogId, ...rest } = createLogDto;

    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    let dependencyLog = null;
    if (dependencyLogId) {
      const accountIdNum =
        typeof accountId === 'string' ? parseInt(accountId, 10) : accountId;
      dependencyLog = await this.logRepository.findOne({
        where: { id: dependencyLogId, account: { id: accountIdNum } },
      });
      if (!dependencyLog) {
        throw new ForbiddenException(
          'Dependency log not found or does not belong to your account',
        );
      }
    }

    const log = this.logRepository.create({
      ...rest,
      account,
      dependencyLog,
    });

    if (!log.completedDate) {
      log.completedDate = new Date();
    }

    const savedLog = await this.logRepository.save(log);

    await this.goalsService.addProgressForMetric(
      accountId,
      GoalMetric.LOGS_ADDED,
      1,
    );

    await this.goalsService.addProgressForMetric(
      accountId,
      GoalMetric.LOGS_COMPLETED,
      1,
    );

    return savedLog;
  }

  private getUtcRangeFromLocalDate(
    localDateStr: string,
    timezone: string,
  ): {
    startUtc: Date;
    endUtc: Date;
  } {
    const [year, month, day] = localDateStr.split('-').map(Number);
    const naiveDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const startUtc = fromZonedTime(naiveDate, timezone);
    const endUtc = addDays(startUtc, 1);
    return { startUtc, endUtc };
  }

  /** Account + date/status predicates shared by list and mood-options queries. */
  private applySharedListFilters(
    qb: SelectQueryBuilder<Log>,
    accountIdNum: number,
    completedDate: string | undefined,
    timeZone: string | undefined,
    status: string | undefined,
  ): void {
    qb.where('log.deletedAt IS NULL').andWhere('log.accountId = :accountId', {
      accountId: accountIdNum,
    });
    if (status === 'true') {
      if (completedDate && timeZone) {
        const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
          completedDate,
          timeZone,
        );
        qb.andWhere(
          'log.completedDate >= :startUtc AND log.completedDate < :endUtc',
          { startUtc, endUtc },
        );
      }
    } else if (completedDate && timeZone) {
      const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
        completedDate,
        timeZone,
      );
      qb.andWhere(
        '((log.completedDate >= :startUtc AND log.completedDate < :endUtc) OR (log.completedDate IS NULL AND log.createdAt >= :startUtc AND log.createdAt < :endUtc))',
        { startUtc, endUtc },
      );
    }
  }

  private applyListOrderBy(
    qb: SelectQueryBuilder<Log>,
    completedDate: string | undefined,
    timeZone: string | undefined,
    status: string | undefined,
  ): void {
    if (status === 'true') {
      if (completedDate && timeZone) {
        qb.orderBy('COALESCE(log.completedDate, log.createdAt)', 'DESC');
      } else {
        qb.orderBy('log.completedDate', 'DESC').limit(10);
      }
    } else if (completedDate && timeZone) {
      qb.addOrderBy('COALESCE(log.completedDate, log.createdAt)', 'DESC');
    } else {
      qb.orderBy('COALESCE(log.completedDate, log.createdAt)', 'DESC');
    }
  }

  private applySearchSubstringFilter(
    qb: SelectQueryBuilder<Log>,
    search?: string,
  ): void {
    const term = search?.trim();
    if (!term) {
      return;
    }
    qb.andWhere(
      '(STRPOS(LOWER(COALESCE(log.name, :emptyStr)), LOWER(:searchPlain)) > 0 OR STRPOS(LOWER(COALESCE(log.surroundings, :emptyStr)), LOWER(:searchPlain)) > 0)',
      { searchPlain: term, emptyStr: '' },
    );
  }

  private applyMoodEqualsFilter(
    qb: SelectQueryBuilder<Log>,
    mood?: string,
  ): void {
    const m = mood?.trim();
    if (!m) {
      return;
    }
    qb.andWhere('LOWER(TRIM(log.mood)) = LOWER(TRIM(:filterMood))', {
      filterMood: m,
    });
  }

  private normalizeListRequest(request: {
    completedDate?: string;
    status?: string;
    accountId?: string;
    timeZone?: string;
  }): {
    accountIdNum: number;
    completedDate?: string;
    timeZone?: string;
    status?: string;
  } | null {
    const { accountId } = request;
    let { completedDate, status, timeZone } = request;

    if (!accountId) {
      throw new UnauthorizedException('Account ID is required');
    }
    const accountIdNum = parseInt(accountId, 10);
    if (Number.isNaN(accountIdNum)) {
      throw new UnauthorizedException('Invalid account ID');
    }

    if (status === 'true' && !completedDate) {
      const now = new Date();
      if (timeZone) {
        completedDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
      } else {
        completedDate = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd');
        timeZone = 'UTC';
      }
    }

    if (status === 'false') {
      return null;
    }

    return { accountIdNum, completedDate, timeZone, status };
  }

  async findAll(
    request: {
      completedDate?: string;
      status?: string;
      accountId?: string;
      timeZone?: string;
      mood?: string;
      search?: string;
    } = {},
  ): Promise<Log[]> {
    const { mood, search, ...rest } = request;
    const normalized = this.normalizeListRequest(rest);
    if (!normalized) {
      return [];
    }
    const { accountIdNum, completedDate, timeZone, status } = normalized;

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.dependencyLog', 'dependencyLog')
      .leftJoinAndSelect('log.notes', 'notes');

    this.applySharedListFilters(
      queryBuilder,
      accountIdNum,
      completedDate,
      timeZone,
      status,
    );
    this.applySearchSubstringFilter(queryBuilder, search);
    this.applyMoodEqualsFilter(queryBuilder, mood);
    this.applyListOrderBy(queryBuilder, completedDate, timeZone, status);

    return queryBuilder.getMany();
  }

  /** Distinct non-null moods for the account matching date + search (not mood). */
  async findDistinctMoods(request: {
    completedDate?: string;
    status?: string;
    accountId?: string;
    timeZone?: string;
    search?: string;
  }): Promise<string[]> {
    const { search, ...rest } = request;
    const normalized = this.normalizeListRequest(rest);
    if (!normalized) {
      return [];
    }
    const { accountIdNum, completedDate, timeZone, status } = normalized;

    const qb = this.logRepository.createQueryBuilder('log');
    this.applySharedListFilters(
      qb,
      accountIdNum,
      completedDate,
      timeZone,
      status,
    );
    this.applySearchSubstringFilter(qb, search);
    qb.andWhere('log.mood IS NOT NULL');
    qb.select('log.mood', 'mood')
      .groupBy('log.mood')
      .orderBy('log.mood', 'ASC');

    const raw = await qb.getRawMany();
    return raw.map((row) => row.mood as string);
  }

  async findOne(id: string, accountId: string): Promise<Log> {
    const log = await this.logRepository.findOne({
      where: { id, account: { id: accountId as unknown as number } },
      relations: ['account', 'dependencyLog', 'notes'],
      withDeleted: false,
    });
    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
    return log;
  }

  async update(
    updateLogDto: UpdateLogDto,
    id: string,
    accountId: string,
  ): Promise<Log> {
    const log = await this.logRepository.findOne({
      where: { id, account: { id: accountId as unknown as number } },
      relations: ['account'],
    });

    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }

    if (updateLogDto.name !== undefined) log.name = updateLogDto.name;
    if (updateLogDto.description !== undefined)
      log.description = updateLogDto.description;
    if (updateLogDto.startTime !== undefined)
      log.startTime = updateLogDto.startTime;
    if (updateLogDto.endTime !== undefined) log.endTime = updateLogDto.endTime;

    if (updateLogDto.surroundings !== undefined)
      log.surroundings = updateLogDto.surroundings ?? null;
    if (updateLogDto.mood !== undefined) log.mood = updateLogDto.mood ?? null;

    if (updateLogDto.dependencyLogId !== undefined) {
      if (updateLogDto.dependencyLogId) {
        const accountIdNum =
          typeof accountId === 'string' ? parseInt(accountId, 10) : accountId;
        const depLog = await this.logRepository.findOne({
          where: {
            id: updateLogDto.dependencyLogId,
            account: { id: accountIdNum },
          },
        });
        if (!depLog) {
          throw new ForbiddenException(
            'Dependency log not found or does not belong to your account',
          );
        }
        log.dependencyLog = depLog;
      } else {
        log.dependencyLog = null;
      }
    }

    if (updateLogDto.completedDate !== undefined) {
      log.completedDate = updateLogDto.completedDate
        ? new Date(updateLogDto.completedDate)
        : null;
    }
    if (!log.completedDate) {
      log.completedDate = new Date();
    }

    return this.logRepository.save(log);
  }

  async remove(id: string, accountId: string): Promise<void> {
    const log = await this.logRepository.findOne({
      where: { id, account: { id: accountId as unknown as number } },
    });
    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
    await this.logRepository.softDelete(id);
  }

  async getLogCounts(
    accountId: string,
  ): Promise<{ completed: number; incomplete: number; total: number }> {
    if (!accountId) {
      throw new UnauthorizedException('Account ID is required');
    }
    const accountIdNum = parseInt(accountId, 10);
    if (Number.isNaN(accountIdNum)) {
      throw new BadRequestException('Invalid account ID');
    }
    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .where('log.deletedAt IS NULL')
      .andWhere('log.accountId = :accountId', { accountId: accountIdNum });

    const total = await queryBuilder.getCount();

    return { completed: total, incomplete: 0, total };
  }
}
