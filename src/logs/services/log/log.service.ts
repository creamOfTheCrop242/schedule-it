import {
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
      dependencyLog = await this.logRepository.findOne({
        where: { id: dependencyLogId },
      });
    }

    const log = this.logRepository.create({
      ...rest,
      account,
      dependencyLog,
    });

    if (log.completed && !log.completedDate) {
      log.completedDate = new Date();
    }

    const savedLog = await this.logRepository.save(log);

    if (savedLog.completed) {
      await this.goalsService.addProgressForMetric(
        accountId,
        GoalMetric.LOGS_COMPLETED,
        1,
      );
    }

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
      token?: string;
      timeZone?: string;
    } = {},
  ): Promise<Log[]> {
    let { completedDate, status, token, timeZone } = request;

    if (!token) {
      throw new UnauthorizedException('Token is required');
    }
    const accountId = this.extractAccountIdFromToken(token);

    if (status === 'true' && !completedDate) {
      const now = new Date();
      if (timeZone) {
        completedDate = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
      } else {
        completedDate = formatInTimeZone(now, 'UTC', 'yyyy-MM-dd');
        timeZone = 'UTC';
      }
    }

    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.dependencyLog', 'dependencyLog')
      .leftJoinAndSelect('log.notes', 'notes')
      .where('log.deletedAt IS NULL')
      .andWhere('log.accountId = :accountId', { accountId });

    if (status === 'true') {
      queryBuilder.andWhere('log.completed = true');

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
    } else if (status === 'false') {
      queryBuilder
        .andWhere('log.completed = false')
        .addOrderBy(
          `CASE log.priority 
            WHEN 'High' THEN 1 
            WHEN 'Medium' THEN 2 
            WHEN 'Low' THEN 3 
            ELSE 4 
          END`,
          'ASC',
        )
        .addOrderBy('log.createdAt', 'DESC');
    }

    return queryBuilder.getMany();
  }

  private extractAccountIdFromToken(token: string): string {
    try {
      const payload = this.jwtService.decode(token);
      return payload.id;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async findOne(id: string): Promise<Log> {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['account', 'dependencyLog', 'notes'],
      withDeleted: false,
    });
    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
    return log;
  }

  async update(updateLogDto: UpdateLogDto, id: string): Promise<Log> {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }

    const wasCompleted = log.completed;

    if (updateLogDto.name !== undefined) log.name = updateLogDto.name;
    if (updateLogDto.description !== undefined)
      log.description = updateLogDto.description;
    if (updateLogDto.priority !== undefined)
      log.priority = updateLogDto.priority;
    if (updateLogDto.startDate !== undefined)
      log.startDate = updateLogDto.startDate;
    if (updateLogDto.dueDate !== undefined)
      log.dueDate = updateLogDto.dueDate;

    if (updateLogDto.completed !== undefined) {
      log.completed = updateLogDto.completed;
      if (log.completed) {
        log.completedDate = updateLogDto.completedDate ?? new Date();
      } else {
        log.completedDate = null;
      }
    } else if (updateLogDto.completedDate !== undefined) {
      log.completedDate = updateLogDto.completedDate;
    }

    if (updateLogDto.dependencyLogId !== undefined) {
      if (updateLogDto.dependencyLogId) {
        log.dependencyLog = await this.logRepository.findOne({
          where: { id: updateLogDto.dependencyLogId },
        });
      } else {
        log.dependencyLog = null;
      }
    }

    const savedLog = await this.logRepository.save(log);

    if (
      updateLogDto.completed !== undefined &&
      wasCompleted !== log.completed
    ) {
      if (log.completed) {
        await this.goalsService.addProgressForMetric(
          log.account.id.toString(),
          GoalMetric.LOGS_COMPLETED,
          1,
        );
      } else {
        await this.goalsService.subtractProgressForMetric(
          log.account.id.toString(),
          GoalMetric.LOGS_COMPLETED,
          1,
        );
      }
    }

    return savedLog;
  }

  async toggleComplete(id: string): Promise<Log> {
    const log = await this.logRepository.findOne({
      where: { id },
      relations: ['account'],
    });

    if (!log) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }

    log.completed = !log.completed;

    if (log.completed) {
      log.completedDate = new Date();
      await this.goalsService.addProgressForMetric(
        log.account.id.toString(),
        GoalMetric.LOGS_COMPLETED,
        1,
      );
    } else {
      await this.goalsService.subtractProgressForMetric(
        log.account.id.toString(),
        GoalMetric.LOGS_COMPLETED,
        1,
      );
      log.completedDate = null;
    }

    return this.logRepository.save(log);
  }

  async remove(id: string): Promise<void> {
    const result = await this.logRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Log with ID ${id} not found`);
    }
  }

  async getLogCounts(
    accountId?: string,
  ): Promise<{ completed: number; incomplete: number; total: number }> {
    const queryBuilder = this.logRepository.createQueryBuilder('log');

    if (accountId) {
      queryBuilder.where('log.account.id = :accountId', { accountId });
    }

    const [completed, incomplete] = await Promise.all([
      queryBuilder
        .clone()
        .andWhere('log.completed = :completed', { completed: true })
        .getCount(),
      queryBuilder
        .clone()
        .andWhere('log.completed = :completed', { completed: false })
        .getCount(),
    ]);

    return { completed, incomplete, total: completed + incomplete };
  }
}
