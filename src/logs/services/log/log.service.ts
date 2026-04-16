import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  async findAll(
    request: {
      completedDate?: string;
      status?: string;
      accountId?: string;
      timeZone?: string;
    } = {},
  ): Promise<Log[]> {
    let { completedDate, status, accountId, timeZone } = request;

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
      return [];
    }

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.dependencyLog', 'dependencyLog')
      .leftJoinAndSelect('log.notes', 'notes')
      .where('log.deletedAt IS NULL')
      .andWhere('log.accountId = :accountId', { accountId: accountIdNum });

    if (status === 'true') {
      if (completedDate && timeZone) {
        const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
          completedDate,
          timeZone,
        );
        queryBuilder.andWhere(
          'log.completedDate >= :startUtc AND log.completedDate < :endUtc',
          { startUtc, endUtc },
        );
      } else {
        queryBuilder.orderBy('log.completedDate', 'DESC').limit(10);
      }
    } else if (completedDate && timeZone) {
      const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
        completedDate,
        timeZone,
      );
      queryBuilder.andWhere(
        '(log.completedDate >= :startUtc AND log.completedDate < :endUtc) OR (log.completedDate IS NULL AND log.createdAt >= :startUtc AND log.createdAt < :endUtc)',
        { startUtc, endUtc },
      );
      queryBuilder.addOrderBy(
        'COALESCE(log.completedDate, log.createdAt)',
        'DESC',
      );
    }

    return queryBuilder.getMany();
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
    if (updateLogDto.endTime !== undefined)
      log.endTime = updateLogDto.endTime;

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
