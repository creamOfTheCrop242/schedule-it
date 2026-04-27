// goals.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoalDefinition } from '../entities/goal-definition.entity';
import { GoalProgress } from '../entities/goal-progress.entity';
import { GoalMetric, GoalScope } from '../goals.model';
import { deriveTargetsFromDaily } from '../helpers/goal-derive.helpers';
import { computePeriod } from '../helpers/goal.helpers';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(GoalDefinition)
    private readonly defs: Repository<GoalDefinition>,
    @InjectRepository(GoalProgress)
    private readonly progress: Repository<GoalProgress>,
  ) {}

  // Create or update a goal definition for a user/metric/scope
  async upsertGoal(
    accountId: string,
    metric: GoalMetric,
    scope: GoalScope,
    targetValue: number,
    filters?: Record<string, any>,
  ) {
    let def = await this.defs.findOne({
      where: { account: { id: parseInt(accountId) }, metric, scope },
    });

    if (!def) {
      def = this.defs.create({
        account: { id: parseInt(accountId) } as any,
        metric,
        scope,
        targetValue: String(targetValue),
        filters,
      });
    } else {
      def.targetValue = String(targetValue);
      def.filters = filters;
    }

    return this.defs.save(def);
  }

  /**
   * Daily-only goals: user sets a single daily target and we derive week/month/year
   * using fixed multipliers (7/30/365). This keeps the existing per-scope progress
   * model intact by materializing derived goal_definitions rows.
   */
  async upsertDailyGoal(
    accountId: string,
    metric: GoalMetric,
    dailyTargetValue: number,
    filters?: Record<string, any>,
  ) {
    const { day, week, month, year } = deriveTargetsFromDaily(dailyTargetValue);
    await this.upsertGoal(accountId, metric, GoalScope.DAY, day, filters);
    await this.upsertGoal(accountId, metric, GoalScope.WEEK, week, filters);
    await this.upsertGoal(accountId, metric, GoalScope.MONTH, month, filters);
    await this.upsertGoal(accountId, metric, GoalScope.YEAR, year, filters);
    return { success: true };
  }

  // Increment progress for all goals matching user+metric (day/week/month/year)
  async addProgressForMetric(
    accountId: string,
    metric: GoalMetric,
    amount: number,
    at = new Date(),
  ) {
    const defs = await this.defs.find({
      where: { account: { id: parseInt(accountId) }, metric },
    });
    if (!defs.length) return;

    for (const def of defs) {
      const { key, start, end } = computePeriod(def.scope, at);

      let row = await this.progress.findOne({
        where: { goal: { id: def.id }, periodKey: key },
        relations: ['goal'],
      });

      if (!row) {
        row = this.progress.create({
          goal: { id: def.id } as any,
          periodKey: key,
          periodStart: start,
          periodEnd: end,
          currentValue: '0',
          targetSnapshot: def.targetValue, // snapshot at creation
          completed: false,
        });
      }

      const current = parseFloat(row.currentValue) || 0;
      const next = current + amount;
      row.currentValue = String(next);

      const target = parseFloat(row.targetSnapshot) || 0;
      row.completed = next >= target;

      await this.progress.save(row);
    }
  }

  // Decrement progress (e.g., when a completion is undone)
  async subtractProgressForMetric(
    accountId: string,
    metric: GoalMetric,
    amount: number,
    at = new Date(),
  ) {
    const defs = await this.defs.find({
      where: { account: { id: parseInt(accountId) }, metric },
    });
    if (!defs.length) return;

    for (const def of defs) {
      const { key } = computePeriod(def.scope, at);

      const row = await this.progress.findOne({
        where: { goal: { id: def.id }, periodKey: key },
        relations: ['goal'],
      });
      if (!row) continue;

      const current = parseFloat(row.currentValue) || 0;
      const next = Math.max(0, current - amount);
      row.currentValue = String(next);

      const target = parseFloat(row.targetSnapshot) || 0;
      row.completed = next >= target;

      await this.progress.save(row);
    }
  }

  // Override a single period’s target (retroactive/specific date)
  async setPeriodTargetSnapshot(
    accountId: string,
    metric: GoalMetric,
    scope: GoalScope,
    at: Date,
    newTarget: number,
  ) {
    const def = await this.defs.findOne({
      where: { account: { id: parseInt(accountId) }, metric, scope },
    });
    if (!def) throw new NotFoundException('Goal definition not found');

    const { key, start, end } = computePeriod(scope, at);

    let row = await this.progress.findOne({
      where: { goal: { id: def.id }, periodKey: key },
      relations: ['goal'],
    });

    if (!row) {
      row = this.progress.create({
        goal: { id: def.id } as any,
        periodKey: key,
        periodStart: start,
        periodEnd: end,
        currentValue: '0',
        targetSnapshot: String(newTarget),
        completed: false,
      });
    } else {
      row.targetSnapshot = String(newTarget);
    }

    const current = parseFloat(row.currentValue) || 0;
    row.completed = current >= newTarget;

    return this.progress.save(row);
  }

  // Get the user's current status for all scopes of a metric
  async getCurrentStatus(accountId: string, metric: GoalMetric) {
    const defs = await this.defs.find({
      where: { account: { id: parseInt(accountId) }, metric },
      order: { scope: 'ASC' },
    });

    /**
     * Backfill derived scopes for legacy users who only have a DAY definition.
     * We keep the materialized model: create WEEK/MONTH/YEAR definitions derived
     * from the DAY target (×7 / ×30 / ×365) so existing progress logic keeps working.
     */
    const have = new Set(defs.map((d) => d.scope));
    if (have.has(GoalScope.DAY) && (!have.has(GoalScope.WEEK) || !have.has(GoalScope.MONTH) || !have.has(GoalScope.YEAR))) {
      const dayDef = defs.find((d) => d.scope === GoalScope.DAY);
      if (dayDef) {
        const daily = Number(dayDef.targetValue);
        await this.upsertDailyGoal(accountId, metric, daily, dayDef.filters);
        const refreshed = await this.defs.find({
          where: { account: { id: parseInt(accountId) }, metric },
          order: { scope: 'ASC' },
        });
        defs.splice(0, defs.length, ...refreshed);
      }
    }

    const result = [];
    for (const def of defs) {
      const { key } = computePeriod(def.scope, new Date());
      const prog = await this.progress.findOne({
        where: { goal: { id: def.id }, periodKey: key },
      });

      result.push({
        goalId: def.id,
        metric: def.metric,
        scope: def.scope,
        periodKey: key,
        target: Number(def.targetValue),
        currentValue: prog ? Number(prog.currentValue) : 0,
        targetSnapshot: prog
          ? Number(prog.targetSnapshot)
          : Number(def.targetValue),
        completed: prog ? prog.completed : false,
      });
    }

    return result;
  }
}
