import { IsEnum, IsNumber, IsOptional, IsObject, IsDateString } from 'class-validator';

// goal-scope.enum.ts
export enum GoalScope {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

// goal-metric.enum.ts
export enum GoalMetric {
  LOGS_ADDED = 'LOGS_ADDED',
  LOGS_COMPLETED = 'LOGS_COMPLETED',
  // later: HABITS_COMPLETED, MINUTES_FOCUSED, etc.
}

export class UpsertGoalDto {
  @IsEnum(GoalMetric)
  metric: GoalMetric;

  @IsEnum(GoalScope)
  scope: GoalScope;

  @IsNumber()
  targetValue: number;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

export class AddProgressDto {
  @IsEnum(GoalMetric)
  metric: GoalMetric;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  at?: string;
}

export class SubtractProgressDto {
  @IsEnum(GoalMetric)
  metric: GoalMetric;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  at?: string;
}

export class SetPeriodTargetDto {
  metric: GoalMetric;
  scope: GoalScope;
  dateISO: string; // any date inside the period you want to edit
  newTarget: number;
}
