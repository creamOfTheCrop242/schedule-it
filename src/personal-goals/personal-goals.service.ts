import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AccountService } from 'src/accounts/services/account/account.service';
import { Log } from 'src/logs/entities/log.entity';
import { PersonalGoal } from './entities/personal-goal.entity';
import { CreatePersonalGoalDto, UpdatePersonalGoalDto } from './personal-goals.model';

export type PersonalGoalWithStats = PersonalGoal & {
  linkedLogCount: number;
};

@Injectable()
export class PersonalGoalsService {
  constructor(
    @InjectRepository(PersonalGoal)
    private readonly personalGoalRepository: Repository<PersonalGoal>,
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
   * Resolve personal goal id for log/task writes; returns null if omitted.
   */
  async resolvePersonalGoalForWrite(
    personalGoalId: string | undefined | null,
    accountId: string,
  ): Promise<PersonalGoal | null> {
    if (
      personalGoalId === undefined ||
      personalGoalId === null ||
      String(personalGoalId).trim() === ''
    ) {
      return null;
    }
    const id = String(personalGoalId).trim();
    const accountIdNum = this.accountIdNum(accountId);
    const goal = await this.personalGoalRepository.findOne({
      where: { id, account: { id: accountIdNum } },
    });
    if (!goal) {
      throw new ForbiddenException(
        'Personal goal not found or does not belong to your account',
      );
    }
    return goal;
  }

  private normalizeTargetDate(
    value: string | undefined | null,
  ): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null || String(value).trim() === '') {
      return null;
    }
    const s = String(value).trim().slice(0, 10);
    return s.length > 0 ? s : null;
  }

  private async loadLinkedLogCounts(
    goalIds: string[],
    accountId: string,
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (goalIds.length === 0) {
      return result;
    }
    const accountIdNum = this.accountIdNum(accountId);
    const rows = await this.logRepository
      .createQueryBuilder('log')
      .select('log.personalGoalId', 'goalId')
      .addSelect('COUNT(*)', 'cnt')
      .where('log.accountId = :accountId', { accountId: accountIdNum })
      .andWhere('log.deletedAt IS NULL')
      .andWhere('log.personalGoalId IN (:...goalIds)', { goalIds })
      .groupBy('log.personalGoalId')
      .getRawMany();

    for (const row of rows) {
      result.set(row.goalId as string, parseInt(String(row.cnt), 10) || 0);
    }
    for (const id of goalIds) {
      if (!result.has(id)) {
        result.set(id, 0);
      }
    }
    return result;
  }

  private enrichWithCounts(
    goals: PersonalGoal[],
    byId: Map<string, number>,
  ): PersonalGoalWithStats[] {
    return goals.map((g) => ({
      ...g,
      linkedLogCount: byId.get(g.id) ?? 0,
    }));
  }

  async create(
    dto: CreatePersonalGoalDto,
    accountId: string,
  ): Promise<PersonalGoalWithStats> {
    const account = await this.accountService.findAccountById(accountId);
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    const desc =
      dto.description !== undefined && dto.description !== null
        ? String(dto.description).trim()
        : '';
    const td = this.normalizeTargetDate(dto.targetDate);
    const goal = this.personalGoalRepository.create({
      title: String(dto.title).trim(),
      description: desc.length > 0 ? desc : null,
      targetDate: td === undefined ? null : td,
      account,
    });
    const saved = await this.personalGoalRepository.save(goal);
    const counts = await this.loadLinkedLogCounts([saved.id], accountId);
    return this.enrichWithCounts([saved], counts)[0];
  }

  async findAll(accountId: string): Promise<PersonalGoalWithStats[]> {
    const accountIdNum = this.accountIdNum(accountId);
    const goals = await this.personalGoalRepository.find({
      where: { account: { id: accountIdNum } },
      order: { createdAt: 'DESC' },
    });
    const counts = await this.loadLinkedLogCounts(
      goals.map((g) => g.id),
      accountId,
    );
    return this.enrichWithCounts(goals, counts);
  }

  async findOne(id: string, accountId: string): Promise<PersonalGoalWithStats> {
    const accountIdNum = this.accountIdNum(accountId);
    const goal = await this.personalGoalRepository.findOne({
      where: { id, account: { id: accountIdNum } },
    });
    if (!goal) {
      throw new NotFoundException(`Personal goal ${id} not found`);
    }
    const counts = await this.loadLinkedLogCounts([goal.id], accountId);
    return this.enrichWithCounts([goal], counts)[0];
  }

  /**
   * Non-deleted logs for this account that reference the personal goal.
   * Ordered by completed date (newest first), then updated time.
   * @param options When `limit` or `includeNotes` is set, uses a query builder (bounded fetch, optional notes).
   */
  async findLogsForPersonalGoal(
    goalId: string,
    accountId: string,
    options?: { limit?: number; includeNotes?: boolean },
  ): Promise<Log[]> {
    await this.findOne(goalId, accountId);
    const accountIdNum = this.accountIdNum(accountId);

    const needsQueryBuilder =
      options !== undefined &&
      (options.limit !== undefined || options.includeNotes === true);

    if (!needsQueryBuilder) {
      return this.logRepository.find({
        where: {
          personalGoal: { id: goalId },
          account: { id: accountIdNum },
        },
        relations: ['habit', 'personalGoal'],
        order: { completedDate: 'DESC', updatedAt: 'DESC' },
      });
    }

    const qb = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.habit', 'habit')
      .leftJoinAndSelect('log.personalGoal', 'personalGoal')
      .where('log.accountId = :accountId', { accountId: accountIdNum })
      .andWhere('log.personalGoalId = :goalId', { goalId })
      .andWhere('log.deletedAt IS NULL')
      .orderBy('log.completedDate', 'DESC', 'NULLS LAST')
      .addOrderBy('log.updatedAt', 'DESC');

    if (options!.includeNotes) {
      qb.leftJoinAndSelect('log.notes', 'notes');
    }
    if (options!.limit !== undefined && options!.limit > 0) {
      const cap = Math.min(options!.limit, 100);
      qb.take(cap);
    }

    return qb.getMany();
  }

  async update(
    id: string,
    dto: UpdatePersonalGoalDto,
    accountId: string,
  ): Promise<PersonalGoalWithStats> {
    const goal = await this.personalGoalRepository.findOne({
      where: { id, account: { id: this.accountIdNum(accountId) } },
    });
    if (!goal) {
      throw new NotFoundException(`Personal goal ${id} not found`);
    }
    if (dto.title !== undefined) {
      goal.title = String(dto.title).trim();
    }
    if (dto.description !== undefined) {
      const d = dto.description === null ? '' : String(dto.description).trim();
      goal.description = d.length > 0 ? d : null;
    }
    if (dto.targetDate !== undefined) {
      if (dto.targetDate === null || dto.targetDate === '') {
        goal.targetDate = null;
      } else {
        goal.targetDate = this.normalizeTargetDate(dto.targetDate) ?? null;
      }
    }
    const saved = await this.personalGoalRepository.save(goal);
    const counts = await this.loadLinkedLogCounts([saved.id], accountId);
    return this.enrichWithCounts([saved], counts)[0];
  }

  async remove(id: string, accountId: string): Promise<void> {
    const goal = await this.personalGoalRepository.findOne({
      where: { id, account: { id: this.accountIdNum(accountId) } },
    });
    if (!goal) {
      throw new NotFoundException(`Personal goal ${id} not found`);
    }
    await this.personalGoalRepository.softDelete(id);
  }
}
