import { computePeriod } from 'src/goals/helpers/goal.helpers';
import { GoalScope } from 'src/goals/goals.model';

import {
  bucketLogTimestampsToPeriodCounts,
  computeCurrentStreak,
  computeLongestStreak,
  DEFAULT_HABIT_TIMEZONE,
  nextPeriodKey,
  previousPeriodKey,
  weekStartForKey,
} from './habit-streak.util';

describe('habit-streak.util', () => {
  const tz = DEFAULT_HABIT_TIMEZONE;

  describe('previousPeriodKey / nextPeriodKey', () => {
    it('round-trips DAY', () => {
      const k = '2025-04-10';
      expect(nextPeriodKey(GoalScope.DAY, previousPeriodKey(GoalScope.DAY, k, tz), tz)).toBe(
        k,
      );
    });

    it('round-trips MONTH', () => {
      const k = '2025-04';
      expect(nextPeriodKey(GoalScope.MONTH, previousPeriodKey(GoalScope.MONTH, k, tz), tz)).toBe(
        k,
      );
    });

    it('round-trips YEAR', () => {
      const k = '2025';
      expect(nextPeriodKey(GoalScope.YEAR, previousPeriodKey(GoalScope.YEAR, k, tz), tz)).toBe(
        k,
      );
    });

    it('resolves WEEK start and round-trips', () => {
      const at = new Date('2025-04-10T16:00:00.000Z');
      const k = computePeriod(GoalScope.WEEK, at, tz).key;
      const start = weekStartForKey(k, tz);
      expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(nextPeriodKey(GoalScope.WEEK, previousPeriodKey(GoalScope.WEEK, k, tz), tz)).toBe(
        k,
      );
    });
  });

  describe('computeCurrentStreak (daily, lenient)', () => {
    it('returns 0 when yesterday is not satisfied (no grace)', () => {
      const counts = new Map([['2025-04-08', 1]]);
      const now = new Date('2025-04-11T15:00:00.000Z');
      expect(computeCurrentStreak(GoalScope.DAY, counts, 1, now, tz)).toBe(0);
    });

    it('keeps streak from yesterday when today has no log yet (grace)', () => {
      const counts = new Map([
        ['2025-04-09', 1],
        ['2025-04-10', 1],
      ]);
      const now = new Date('2025-04-11T15:00:00.000Z');
      expect(computeCurrentStreak(GoalScope.DAY, counts, 1, now, tz)).toBe(2);
    });

    it('includes today when today is satisfied', () => {
      const counts = new Map([
        ['2025-04-09', 1],
        ['2025-04-10', 1],
        ['2025-04-11', 1],
      ]);
      const now = new Date('2025-04-11T15:00:00.000Z');
      expect(computeCurrentStreak(GoalScope.DAY, counts, 1, now, tz)).toBe(3);
    });
  });

  describe('targetPerPeriod', () => {
    it('requires multiple logs per day when target > 1', () => {
      const counts = new Map([['2025-04-11', 1]]);
      const now = new Date('2025-04-11T15:00:00.000Z');
      expect(computeCurrentStreak(GoalScope.DAY, counts, 2, now, tz)).toBe(0);
      counts.set('2025-04-11', 2);
      expect(computeCurrentStreak(GoalScope.DAY, counts, 2, now, tz)).toBe(1);
    });
  });

  describe('computeLongestStreak', () => {
    it('finds longest run across gaps', () => {
      const counts = new Map([
        ['2025-04-01', 1],
        ['2025-04-02', 1],
        ['2025-04-03', 1],
        ['2025-04-10', 1],
        ['2025-04-11', 1],
      ]);
      expect(computeLongestStreak(GoalScope.DAY, counts, 1, tz)).toBe(3);
    });
  });
});
