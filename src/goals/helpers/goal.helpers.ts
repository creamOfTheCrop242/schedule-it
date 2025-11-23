// period.util.ts
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { GoalScope } from '../goals.model';

/**
 * Computes the normalized period for a given timestamp and goal scope,
 * in the context of a specific IANA timezone (e.g. "America/New_York").
 *
 * Returns:
 *  - key:   string identifier for the period (e.g. "2025-11-03", "2025-W45", "2025-11", "2025")
 *  - start: local calendar start date (YYYY-MM-DD) in that timezone
 *  - end:   local calendar end date (YYYY-MM-DD) in that timezone
 *
 * Example:
 *  computePeriod(GoalScope.DAY,  new Date('2025-11-03T15:00:00Z'), "America/New_York")
 *   → { key: '2025-11-03', start: '2025-11-03', end: '2025-11-03' }
 *
 *  computePeriod(GoalScope.WEEK, new Date('2025-11-03T15:00:00Z'), "America/New_York")
 *   → { key: '2025-W45', start: '2025-10-27', end: '2025-11-02' }
 */
export function computePeriod(
  scope: GoalScope,
  at: Date = new Date(),
  timeZone = 'America/New_York', // change or pass per-user
) {
  switch (scope) {
    // 🗓️ DAY
    case GoalScope.DAY: {
      // Local (user TZ) calendar date
      const key = formatInTimeZone(at, timeZone, 'yyyy-MM-dd');
      return { key, start: key, end: key };
    }

    // 📅 WEEK (ISO-like weeks: Monday–Sunday, in user TZ)
    case GoalScope.WEEK: {
      // Week key: "YYYY-Www" based on local year + ISO week number
      const weekYear = formatInTimeZone(at, timeZone, 'yyyy'); // keep same behavior as old code
      const weekNo = formatInTimeZone(at, timeZone, 'II'); // ISO week number, zero-padded
      const key = `${weekYear}-W${weekNo}`;

      // ISO day of week in user TZ: 1 = Monday ... 7 = Sunday
      const isoDayOfWeek = parseInt(formatInTimeZone(at, timeZone, 'i'), 10);

      // Start of week (Monday) in local calendar:
      const weekStartDateStr = formatInTimeZone(
        addDays(at, -(isoDayOfWeek - 1)),
        timeZone,
        'yyyy-MM-dd',
      );

      // End of week (Sunday) in local calendar:
      const weekEndDateStr = formatInTimeZone(
        addDays(at, 7 - isoDayOfWeek),
        timeZone,
        'yyyy-MM-dd',
      );

      return {
        key,
        start: weekStartDateStr,
        end: weekEndDateStr,
      };
    }

    // 🗓️ MONTH
    case GoalScope.MONTH: {
      // Local year & month in user TZ
      const yearStr = formatInTimeZone(at, timeZone, 'yyyy');
      const monthStr = formatInTimeZone(at, timeZone, 'MM');

      const key = `${yearStr}-${monthStr}`;
      const start = `${key}-01`;

      // Compute last day of this month in calendar terms.
      // 1) Convert strings to numbers
      const y = Number(yearStr);
      const m = Number(monthStr); // 1–12
      // 2) new Date(y, m, 0) → last day of previous month, which is our target month
      const endDate = new Date(y, m, 0);
      const endYear = endDate.getFullYear();
      const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDate.getDate()).padStart(2, '0');
      const end = `${endYear}-${endMonth}-${endDay}`;

      return { key, start, end };
    }

    // 📆 YEAR
    case GoalScope.YEAR: {
      // Local year in user TZ
      const yearStr = formatInTimeZone(at, timeZone, 'yyyy');
      return {
        key: yearStr,
        start: `${yearStr}-01-01`,
        end: `${yearStr}-12-31`,
      };
    }

    default:
      throw new Error(`Unsupported GoalScope: ${scope}`);
  }
}
