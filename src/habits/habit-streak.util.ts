import { addDays, addMonths, addYears } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

import { computePeriod } from 'src/goals/helpers/goal.helpers';
import { GoalScope } from 'src/goals/goals.model';

/** When the client omits `timeZone`, match goals helper default. */
export const DEFAULT_HABIT_TIMEZONE = 'America/New_York';

export function effectiveLogTimestamp(
  completedDate: Date | null,
  createdAt: Date,
): Date {
  return completedDate ?? createdAt;
}

export function bucketLogTimestampsToPeriodCounts(
  scope: GoalScope,
  timestamps: Date[],
  timeZone: string,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const at of timestamps) {
    const key = computePeriod(scope, at, timeZone).key;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

/** Monday start date (yyyy-MM-dd) for a habit week key, matching `computePeriod` / goal.helpers. */
export function weekStartForKey(weekKey: string, timeZone: string): string {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) {
    throw new Error(`Invalid week key: ${weekKey}`);
  }
  const calYear = parseInt(m[1], 10);
  let probe = fromZonedTime(`${calYear - 1}-06-01T12:00:00`, timeZone);
  for (let step = 0; step < 160; step++) {
    const p = computePeriod(GoalScope.WEEK, probe, timeZone);
    if (p.key === weekKey) {
      return p.start;
    }
    probe = addDays(probe, 7);
  }
  probe = fromZonedTime(`${calYear - 1}-06-01T12:00:00`, timeZone);
  for (let step = 0; step < 160; step++) {
    probe = addDays(probe, -7);
    const p = computePeriod(GoalScope.WEEK, probe, timeZone);
    if (p.key === weekKey) {
      return p.start;
    }
  }
  throw new Error(`Could not resolve week ${weekKey}`);
}

export function periodSortKey(
  scope: GoalScope,
  periodKey: string,
  timeZone: string,
): string {
  switch (scope) {
    case GoalScope.DAY:
      return periodKey;
    case GoalScope.MONTH:
      return `${periodKey}-01`;
    case GoalScope.YEAR:
      return `${periodKey}-01-01`;
    case GoalScope.WEEK:
      return weekStartForKey(periodKey, timeZone);
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}

export function previousPeriodKey(
  scope: GoalScope,
  periodKey: string,
  timeZone: string,
): string {
  switch (scope) {
    case GoalScope.DAY: {
      const at = fromZonedTime(`${periodKey}T12:00:00`, timeZone);
      return computePeriod(GoalScope.DAY, addDays(at, -1), timeZone).key;
    }
    case GoalScope.WEEK: {
      const start = weekStartForKey(periodKey, timeZone);
      const at = fromZonedTime(`${start}T12:00:00`, timeZone);
      return computePeriod(GoalScope.WEEK, addDays(at, -7), timeZone).key;
    }
    case GoalScope.MONTH: {
      const at = fromZonedTime(`${periodKey}-15T12:00:00`, timeZone);
      return computePeriod(GoalScope.MONTH, addMonths(at, -1), timeZone).key;
    }
    case GoalScope.YEAR: {
      const at = fromZonedTime(`${periodKey}-06-15T12:00:00`, timeZone);
      return computePeriod(GoalScope.YEAR, addYears(at, -1), timeZone).key;
    }
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}

export function nextPeriodKey(
  scope: GoalScope,
  periodKey: string,
  timeZone: string,
): string {
  switch (scope) {
    case GoalScope.DAY: {
      const at = fromZonedTime(`${periodKey}T12:00:00`, timeZone);
      return computePeriod(GoalScope.DAY, addDays(at, 1), timeZone).key;
    }
    case GoalScope.WEEK: {
      const start = weekStartForKey(periodKey, timeZone);
      const at = fromZonedTime(`${start}T12:00:00`, timeZone);
      return computePeriod(GoalScope.WEEK, addDays(at, 7), timeZone).key;
    }
    case GoalScope.MONTH: {
      const at = fromZonedTime(`${periodKey}-15T12:00:00`, timeZone);
      return computePeriod(GoalScope.MONTH, addMonths(at, 1), timeZone).key;
    }
    case GoalScope.YEAR: {
      const at = fromZonedTime(`${periodKey}-06-15T12:00:00`, timeZone);
      return computePeriod(GoalScope.YEAR, addYears(at, 1), timeZone).key;
    }
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}

/**
 * Lenient current period: if today (current period) is not satisfied but the previous
 * period was, streak still counts backward from the previous period until a gap.
 */
export function computeCurrentStreak(
  scope: GoalScope,
  periodCounts: Map<string, number>,
  targetPerPeriod: number,
  now: Date,
  timeZone: string,
): number {
  const target = Math.max(1, targetPerPeriod);
  const satisfied = (k: string) => (periodCounts.get(k) ?? 0) >= target;
  const currentKey = computePeriod(scope, now, timeZone).key;

  let key: string;
  if (satisfied(currentKey)) {
    key = currentKey;
  } else {
    const prevKey = previousPeriodKey(scope, currentKey, timeZone);
    if (satisfied(prevKey)) {
      key = prevKey;
    } else {
      return 0;
    }
  }

  let streak = 0;
  let walk = key;
  const guard = 100000;
  for (let i = 0; i < guard; i++) {
    if (!satisfied(walk)) {
      break;
    }
    streak++;
    const prev = previousPeriodKey(scope, walk, timeZone);
    if (prev === walk) {
      break;
    }
    walk = prev;
  }
  return streak;
}

/** Longest strictly consecutive run of satisfied periods in calendar order. */
export function computeLongestStreak(
  scope: GoalScope,
  periodCounts: Map<string, number>,
  targetPerPeriod: number,
  timeZone: string,
): number {
  const target = Math.max(1, targetPerPeriod);
  const satisfied = (k: string) => (periodCounts.get(k) ?? 0) >= target;
  const keys = [...periodCounts.keys()].filter((k) => satisfied(k));
  if (keys.length === 0) {
    return 0;
  }
  keys.sort((a, b) =>
    periodSortKey(scope, a, timeZone).localeCompare(
      periodSortKey(scope, b, timeZone),
    ),
  );

  let best = 1;
  let run = 1;
  for (let i = 1; i < keys.length; i++) {
    if (nextPeriodKey(scope, keys[i - 1], timeZone) === keys[i]) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}
