import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { addDays } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

import { AccountService } from 'src/accounts/services/account/account.service';
import { CreateLogDto } from 'src/logs/models/logs.model';
import { LogService } from 'src/logs/services/log/log.service';
import { Task } from 'src/tasks/entities/task.entity';
import { HabitsService } from 'src/habits/habits.service';
import { PersonalGoalsService } from 'src/personal-goals/personal-goals.service';
import { CreateTaskDto, UpdateTaskDto } from 'src/tasks/models/tasks.model';

export type TaskListFilters = {
  completedDate?: string;
  timeZone?: string;
  search?: string;
  completion?: string;
  category?: string;
  limit?: string;
  offset?: string;
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly accountService: AccountService,
    private readonly logService: LogService,
    private readonly habitsService: HabitsService,
    private readonly personalGoalsService: PersonalGoalsService,
  ) {}

  private accountIdNum(accountId: string): number {
    const n = parseInt(accountId, 10);
    if (Number.isNaN(n)) {
      throw new ForbiddenException('Invalid account');
    }
    return n;
  }

  /** Same local-calendar-day → UTC window as log list filtering. */
  private getUtcRangeFromLocalDate(
    localDateStr: string,
    timezone: string,
  ): { startUtc: Date; endUtc: Date } {
    const [year, month, day] = localDateStr.split('-').map(Number);
    const naiveDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const startUtc = fromZonedTime(naiveDate, timezone);
    const endUtc = addDays(startUtc, 1);
    return { startUtc, endUtc };
  }

  private clampPagination(
    limitRaw?: string,
    offsetRaw?: string,
  ): { limit: number; offset: number } {
    const DEFAULT = 10;
    const MAX = 50;
    let limit = DEFAULT;
    if (limitRaw !== undefined && limitRaw !== '') {
      const n = parseInt(limitRaw, 10);
      if (!Number.isNaN(n)) {
        limit = Math.min(Math.max(1, n), MAX);
      }
    }
    let offset = 0;
    if (offsetRaw !== undefined && offsetRaw !== '') {
      const n = parseInt(offsetRaw, 10);
      if (!Number.isNaN(n)) {
        offset = Math.max(0, n);
      }
    }
    return { limit, offset };
  }

  /** List filters on `task` alias (no joins). Caller sets account + deleted + order + pagination. */
  private applyTaskListFilters(
    qb: SelectQueryBuilder<Task>,
    accountIdNum: number,
    filters: Omit<TaskListFilters, 'limit' | 'offset'>,
  ): void {
    qb.where('task.accountId = :accountId', { accountId: accountIdNum }).andWhere(
      'task.deletedAt IS NULL',
    );

    const { completedDate, timeZone } = filters;
    if (completedDate?.trim() && timeZone?.trim()) {
      const { startUtc, endUtc } = this.getUtcRangeFromLocalDate(
        completedDate.trim(),
        timeZone.trim(),
      );
      qb.andWhere(
        '((task.completedDate >= :startUtc AND task.completedDate < :endUtc) OR (task.completedDate IS NULL AND task.createdAt >= :startUtc AND task.createdAt < :endUtc))',
        { startUtc, endUtc },
      );
    }

    const completion = filters.completion?.trim().toLowerCase();
    if (completion === 'open') {
      qb.andWhere('task.completedDate IS NULL');
    } else if (completion === 'done') {
      qb.andWhere('task.completedDate IS NOT NULL');
    }

    const term = filters.search?.trim();
    if (term) {
      qb.andWhere(
        '(STRPOS(LOWER(COALESCE(task.title, :emptyStr)), LOWER(:searchPlain)) > 0 OR STRPOS(LOWER(COALESCE(task.description, :emptyStr)), LOWER(:searchPlain)) > 0)',
        { searchPlain: term, emptyStr: '' },
      );
    }

    const cat = filters.category?.trim();
    if (cat) {
      qb.andWhere(
        'LOWER(TRIM(task.category)) = LOWER(TRIM(:filterCategory))',
        { filterCategory: cat },
      );
    }
  }

  async create(dto: CreateTaskDto, accountId: string): Promise<Task> {
    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const categoryNorm =
      dto.category !== undefined &&
      dto.category !== null &&
      String(dto.category).trim() !== ''
        ? String(dto.category).trim()
        : null;

    const habit = await this.habitsService.resolveHabitForWrite(
      dto.habitId,
      accountId,
    );

    const personalGoal =
      await this.personalGoalsService.resolvePersonalGoalForWrite(
        dto.personalGoalId,
        accountId,
      );

    const task = this.taskRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      category: categoryNorm,
      habit,
      personalGoal,
      account,
      completedDate: null,
      log: null,
    });
    return this.taskRepository.save(task);
  }

  async findAll(
    accountId: string,
    filters: TaskListFilters = {},
  ): Promise<Task[]> {
    const accountIdNum = this.accountIdNum(accountId);
    const completion = filters.completion?.trim().toLowerCase();
    if (completion && completion !== 'open' && completion !== 'done') {
      throw new BadRequestException(
        'Invalid completion; use open, done, or omit for all.',
      );
    }

    const { limit: take, offset: skip } = this.clampPagination(
      filters.limit,
      filters.offset,
    );

    const {
      limit: _l,
      offset: _o,
      ...listFilters
    }: TaskListFilters = filters;

    const idQb = this.taskRepository.createQueryBuilder('task');
    this.applyTaskListFilters(idQb, accountIdNum, listFilters);
    idQb
      .orderBy('COALESCE(task.completedDate, task.createdAt)', 'DESC')
      .take(take)
      .skip(skip);

    const pageRows = await idQb.getMany();
    const ids = pageRows.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }

    const fullQb = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.log', 'log')
      .leftJoinAndSelect('task.habit', 'habit')
      .leftJoinAndSelect('task.personalGoal', 'personalGoal')
      .where('task.id IN (:...ids)', { ids });

    const entities = await fullQb.getMany();
    const orderIndex = new Map(ids.map((id, index) => [id, index]));
    entities.sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    );
    return entities;
  }

  async findOne(id: string, accountId: string): Promise<Task> {
    const accountIdNum = this.accountIdNum(accountId);
    const task = await this.taskRepository.findOne({
      where: { id, account: { id: accountIdNum } },
      relations: ['log', 'habit', 'personalGoal'],
    });
    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }
    return task;
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    accountId: string,
  ): Promise<Task> {
    const task = await this.findOne(id, accountId);
    if (dto.title !== undefined) {
      task.title = dto.title;
    }
    if (dto.description !== undefined) {
      task.description = dto.description ?? null;
    }
    if (dto.category !== undefined) {
      const c = dto.category?.trim();
      task.category = c && c.length > 0 ? c : null;
    }
    if (dto.habitId !== undefined) {
      const raw = dto.habitId;
      if (raw === null || raw === '') {
        task.habit = null;
      } else {
        task.habit = await this.habitsService.resolveHabitForWrite(
          raw,
          accountId,
        );
      }
    }
    if (dto.personalGoalId !== undefined) {
      const raw = dto.personalGoalId;
      if (raw === null || raw === '') {
        task.personalGoal = null;
      } else {
        task.personalGoal =
          await this.personalGoalsService.resolvePersonalGoalForWrite(
            raw,
            accountId,
          );
      }
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string, accountId: string): Promise<void> {
    await this.findOne(id, accountId);
    await this.taskRepository.softDelete(id);
  }

  /**
   * First completion: creates a log via LogService and links it. Idempotent if already completed.
   */
  async complete(id: string, accountId: string): Promise<Task> {
    const task = await this.findOne(id, accountId);
    if (task.log) {
      return this.findOne(id, accountId);
    }

    const completedDate = new Date();
    const createLogDto: CreateLogDto = {
      name: task.title,
      description: task.description ?? undefined,
      completedDate,
      ...(task.category?.trim()
        ? { category: task.category.trim() }
        : {}),
      ...(task.habit?.id ? { habitId: task.habit.id } : {}),
      ...(task.personalGoal?.id
        ? { personalGoalId: task.personalGoal.id }
        : {}),
    };

    const savedLog = await this.logService.create(createLogDto, accountId);

    task.log = savedLog;
    task.completedDate = completedDate;
    await this.taskRepository.save(task);
    return this.findOne(id, accountId);
  }

  /**
   * Clears completion state and unlinks the task from its log.
   * The log row (if any) remains in the database; it is no longer linked from this task.
   * Idempotent when the task is already open.
   */
  async reopen(id: string, accountId: string): Promise<Task> {
    const task = await this.findOne(id, accountId);
    if (!task.completedDate && !task.log) {
      return task;
    }
    task.completedDate = null;
    task.log = null;
    await this.taskRepository.save(task);
    return this.findOne(id, accountId);
  }
}
