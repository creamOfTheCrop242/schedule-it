import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { AccountService } from 'src/accounts/services/account/account.service';
import { Log } from 'src/logs/entities/log.entity';
import { Habit } from './entities/habit.entity';
import { CreateHabitDto, UpdateHabitDto } from './habits.model';

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

  async countLogsForHabit(habitId: string, accountId: string): Promise<number> {
    const accountIdNum = this.accountIdNum(accountId);
    return this.logRepository.count({
      where: {
        habit: { id: habitId },
        account: { id: accountIdNum },
        deletedAt: IsNull(),
      },
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

  async findAll(accountId: string): Promise<(Habit & { logCount: number })[]> {
    const accountIdNum = this.accountIdNum(accountId);
    const habits = await this.habitRepository.find({
      where: { account: { id: accountIdNum } },
      order: { createdAt: 'DESC' },
    });
    const withCounts = await Promise.all(
      habits.map(async (h) => ({
        ...h,
        logCount: await this.countLogsForHabit(h.id, accountId),
      })),
    );
    return withCounts;
  }

  async findOne(
    id: string,
    accountId: string,
  ): Promise<Habit & { logCount: number }> {
    const accountIdNum = this.accountIdNum(accountId);
    const habit = await this.habitRepository.findOne({
      where: { id, account: { id: accountIdNum } },
    });
    if (!habit) {
      throw new NotFoundException(`Habit ${id} not found`);
    }
    const logCount = await this.countLogsForHabit(habit.id, accountId);
    return { ...habit, logCount };
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
