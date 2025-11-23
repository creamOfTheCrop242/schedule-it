// goal-scope.enum.ts
export enum GoalScope {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

// goal-metric.enum.ts
export enum GoalMetric {
  TASKS_COMPLETED = 'TASKS_COMPLETED',
  // later: HABITS_COMPLETED, MINUTES_FOCUSED, etc.
}

export class UpsertGoalDto {
  metric: GoalMetric;
  scope: GoalScope;
  targetValue: number;
  // optional filters for more specific goals (project, tag, etc.)
  filters?: Record<string, any>;
}

export class AddProgressDto {
  metric: GoalMetric;
  amount: number; // usually 1 when completing 1 task
  at?: string; // optional ISO string date for retroactive events
}

export class SubtractProgressDto {
  metric: GoalMetric;
  amount: number; // usually 1 when undoing 1 task
  at?: string; // optional ISO date
}

export class SetPeriodTargetDto {
  metric: GoalMetric;
  scope: GoalScope;
  dateISO: string; // any date inside the period you want to edit
  newTarget: number;
}
