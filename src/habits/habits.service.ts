import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountService } from 'src/accounts/services/account/account.service';
import { GoalScope } from 'src/goals/goals.model';
import { Log } from 'src/logs/entities/log.entity';
import { Habit } from './entities/habit.entity';
import {
  bucketLogTimestampsToPeriodCounts,
  computeCurrentStreak,
  computeLongestStreak,
  DEFAULT_HABIT_TIMEZONE,
  effectiveLogTimestamp,
} from './habit-streak.util';
import { CreateHabitDto, UpdateHabitDto } from './habits.model';

/** API shape for list/detail: lifetime log count plus streak stats (not persisted). */
export type HabitWithStats = Habit & {
  /** Total non-deleted logs linked to this habit (never “resets”). */
  logCount: number;
  currentStreak: number;
  longestStreak: number;
};

@Injectable()
export class HabitsService {
  constructor(
    @InjectRepository(Habit)
    private readonly habitRepository: Repository<Habit>,
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly accountService: AccountService,
  ) {}

  private accountIdNum(accountId: string): number {
    const n = parseInt(accountId, 10);
    if (Number.isNaN(n)) {
      throw new ForbiddenException('Invalid account');
    }
    return n;
  }

  /**
   * Resolve habit id for log/task writes; returns null if habitId omitted.
   * Throws if habit is missing or not owned by the account.
   */
  async resolveHabitForWrite(
    habitId: string | undefined | null,
    accountId: string,
  ): Promise<Habit | null> {
    if (habitId === undefined || habitId === null || String(habitId).trim() === '') {
      return null;
    }
    const id = String(habitId).trim();
    const accountIdNum = this.accountIdNum(accountId);
    const habit = await this.habitRepository.findOne({
      where: { id, account: { id: accountIdNum } },
    });
    if (!habit) {
      throw new ForbiddenException(
        'Habit not found or does not belong to your account',
      );
    }
    return habit;
  }

  private normalizeTimeZone(timeZone?: string): string {
    const t = timeZone?.trim();
    return t && t.length > 0 ? t : DEFAULT_HABIT_TIMEZONE;
  }

  /**
   * All completion timestamps per habit (same rules as streaks), one query.
   */
  private async loadLogTimestampsByHabitId(
    habitIds: string[],
    accountId: string,
  ): Promise<Map<string, Date[]>> {
    const result = new Map<string, Date[]>();
    if (habitIds.length === 0) {
      return result;
    }
    const accountIdNum = this.accountIdNum(accountId);
    const rows = await this.logRepository
      .createQueryBuilder('log')
      .select('log.habitId', 'habitId')
      .addSelect('log.completedDate', 'completedDate')
      .addSelect('log.createdAt', 'createdAt')
      .where('log.accountId = :accountId', { accountId: accountIdNum })
      .andWhere('log.deletedAt IS NULL')
      .andWhere('log.habitId IN (:...habitIds)', { habitIds })
      .getRawMany();

    for (const row of rows) {
      const hid = row.habitId as string;
      const completed = row.completedDate as Date | null;
      const created = row.createdAt as Date;
      const at = effectiveLogTimestamp(completed, created);
      const list = result.get(hid);
      if (list) {
        list.push(at);
      } else {
        result.set(hid, [at]);
      }
    }
    return result;
  }

  private enrichHabitsWithStats(
    habits: Habit[],
    byHabit: Map<string, Date[]>,
    timeZone: string,
  ): HabitWithStats[] {
    const now = new Date();
    return habits.map((h) => {
      const timestamps = byHabit.get(h.id) ?? [];
      const periodCounts = bucketLogTimestampsToPeriodCounts(
        h.cadence,
        timestamps,
        timeZone,
      );
      const logCount = timestamps.length;
      const currentStreak = computeCurrentStreak(
        h.cadence,
        periodCounts,
        h.targetPerPeriod,
        now,
        timeZone,
      );
      const longestStreak = computeLongestStreak(
        h.cadence,
        periodCounts,
        h.targetPerPeriod,
        timeZone,
      );
      return { ...h, logCount, currentStreak, longestStreak };
    });
  }

  async create(dto: CreateHabitDto, accountId: string): Promise<Habit> {
    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const desc =
      dto.description !== undefined && dto.description !== null
        ? String(dto.description).trim()
        : '';
    const habit = this.habitRepository.create({
      name: String(dto.name).trim(),
      description: desc.length > 0 ? desc : null,
      account,
    });
    return this.habitRepository.save(habit);
  }

  async findAll(accountId: string, timeZone?: string): Promise<HabitWithStats[]> {
    const tz = this.normalizeTimeZone(timeZone);
    const accountIdNum = this.accountIdNum(accountId);
    const habits = await this.habitRepository.find({
      where: { account: { id: accountIdNum } },
      order: { createdAt: 'DESC' },
    });
    const byHabit = await this.loadLogTimestampsByHabitId(
      habits.map((h) => h.id),
      accountId,
    );
    return this.enrichHabitsWithStats(habits, byHabit, tz);
  }

  async findOne(
    id: string,
    accountId: string,
    timeZone?: string,
  ): Promise<HabitWithStats> {
    const tz = this.normalizeTimeZone(timeZone);
    const accountIdNum = this.accountIdNum(accountId);
    const habit = await this.habitRepository.findOne({
      where: { id, account: { id: accountIdNum } },
    });
    if (!habit) {
      throw new NotFoundException(`Habit ${id} not found`);
    }
    const byHabit = await this.loadLogTimestampsByHabitId([habit.id], accountId);
    return this.enrichHabitsWithStats([habit], byHabit, tz)[0];
  }

  async update(
    id: string,
    dto: UpdateHabitDto,
    accountId: string,
  ): Promise<Habit> {
    const habit = await this.habitRepository.findOne({
      where: { id, account: { id: this.accountIdNum(accountId) } },
    });
    if (!habit) {
      throw new NotFoundException(`Habit ${id} not found`);
    }
    if (dto.name !== undefined) {
      habit.name = String(dto.name).trim();
    }
    if (dto.description !== undefined) {
      const d = dto.description === null ? '' : String(dto.description).trim();
      habit.description = d.length > 0 ? d : null;
    }
    if (dto.cadence !== undefined) {
      habit.cadence = dto.cadence;
    }
    if (dto.targetPerPeriod !== undefined && dto.targetPerPeriod !== null) {
      habit.targetPerPeriod = Math.max(1, Math.floor(dto.targetPerPeriod));
    }
    return this.habitRepository.save(habit);
  }

  async remove(id: string, accountId: string): Promise<void> {
    const habit = await this.habitRepository.findOne({
      where: { id, account: { id: this.accountIdNum(accountId) } },
    });
    if (!habit) {
      throw new NotFoundException(`Habit ${id} not found`);
    }
    await this.habitRepository.softDelete(id);
  }
}
