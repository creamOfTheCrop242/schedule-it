import { addDays, endOfMonth } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import type { LogPeriodSummaryType } from 'src/logs/entities/log-period-summary.entity';

/** Local calendar date string yyyy-MM-dd at given wall time in `tz` → UTC instant. */
export function utcInstantFromLocalYmdHms(
  ymd: string,
  hour: number,
  minute: number,
  second: number,
  tz: string,
): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    throw new Error(`Invalid ymd: ${ymd}`);
  }
  return fromZonedTime(new Date(y, m - 1, d, hour, minute, second, 0), tz);
}

/** Previous local calendar date relative to `now` in `tz` (noon anchor avoids DST edges). */
export function localYesterdayYmd(now: Date, tz: string): string {
  const todayYmd = formatInTimeZone(now, tz, 'yyyy-MM-dd');
  const todayNoon = utcInstantFromLocalYmdHms(todayYmd, 12, 0, 0, tz);
  return formatInTimeZone(addDays(todayNoon, -1), tz, 'yyyy-MM-dd');
}

/** True if `ymd` in `tz` is a Sunday (ISO week ended that day). */
export function isLocalSundayYmd(ymd: string, tz: string): boolean {
  const noon = utcInstantFromLocalYmdHms(ymd, 12, 0, 0, tz);
  return formatInTimeZone(noon, tz, 'i') === '7';
}

/** True if `ymd` is the last calendar day of its month in `tz`. */
export function isLastDayOfLocalMonthYmd(ymd: string, tz: string): boolean {
  const noon = utcInstantFromLocalYmdHms(ymd, 12, 0, 0, tz);
  const eomYmd = formatInTimeZone(endOfMonth(noon), tz, 'yyyy-MM-dd');
  return ymd === eomYmd;
}

/** True if `ymd` is Dec 31 in `tz`. */
export function isLocalDec31Ymd(ymd: string, tz: string): boolean {
  const noon = utcInstantFromLocalYmdHms(ymd, 12, 0, 0, tz);
  return formatInTimeZone(noon, tz, 'MM-dd') === '12-31';
}

/** ISO week-numbering year + week in the account timezone (local noon anchor). */
export function isoWeekPeriodKeyFromLocalYmd(ymd: string, tz: string): string {
  const noon = utcInstantFromLocalYmdHms(ymd, 12, 0, 0, tz);
  const isoYear = formatInTimeZone(noon, tz, 'RRRR');
  const isoWeek = formatInTimeZone(noon, tz, 'II');
  return `${isoYear}-W${isoWeek.padStart(2, '0')}`;
}

export function monthPeriodKeyFromLocalYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function yearPeriodKeyFromLocalYmd(ymd: string): string {
  return ymd.slice(0, 4);
}

/** [startUtc, endUtc) for one local calendar day. */
export function utcRangeForLocalDay(
  ymd: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  const startUtc = utcInstantFromLocalYmdHms(ymd, 0, 0, 0, tz);
  return { startUtc, endUtc: addDays(startUtc, 1) };
}

/**
 * [startUtc, endUtc) for the ISO week (Mon start) that contains local `ymd`,
 * using weekday in `tz`.
 */
export function utcRangeForLocalIsoWeekContaining(
  ymd: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  let ref = utcInstantFromLocalYmdHms(ymd, 12, 0, 0, tz);
  for (let i = 0; i < 7; i += 1) {
    if (formatInTimeZone(ref, tz, 'i') === '1') {
      const monYmd = formatInTimeZone(ref, tz, 'yyyy-MM-dd');
      const startUtc = utcInstantFromLocalYmdHms(monYmd, 0, 0, 0, tz);
      return { startUtc, endUtc: addDays(startUtc, 7) };
    }
    ref = addDays(ref, -1);
  }
  throw new Error(`Could not find Monday on or before ${ymd} in ${tz}`);
}

/** [startUtc, endUtc) for local calendar month containing `ymd`. */
export function utcRangeForLocalMonthContaining(
  ymd: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  const monthKey = monthPeriodKeyFromLocalYmd(ymd);
  const [y, mo] = monthKey.split('-').map(Number);
  const startUtc = fromZonedTime(new Date(y, mo - 1, 1, 0, 0, 0, 0), tz);
  const endUtc =
    mo === 12
      ? fromZonedTime(new Date(y + 1, 0, 1, 0, 0, 0, 0), tz)
      : fromZonedTime(new Date(y, mo, 1, 0, 0, 0, 0), tz);
  return { startUtc, endUtc };
}

/** [startUtc, endUtc) for local calendar year containing `ymd`. */
export function utcRangeForLocalYearContaining(
  ymd: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  const year = Number(ymd.slice(0, 4));
  const startUtc = fromZonedTime(new Date(year, 0, 1, 0, 0, 0, 0), tz);
  const endUtc = fromZonedTime(new Date(year + 1, 0, 1, 0, 0, 0, 0), tz);
  return { startUtc, endUtc };
}

export function utcRangeForPeriodKey(
  periodType: LogPeriodSummaryType,
  periodKey: string,
  tz: string,
): { startUtc: Date; endUtc: Date } {
  switch (periodType) {
    case 'DAY':
      return utcRangeForLocalDay(periodKey, tz);
    case 'WEEK': {
      const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
      if (!match) {
        throw new Error(`Invalid week periodKey: ${periodKey}`);
      }
      const y = Number(match[1]);
      const targetKey = periodKey;
      for (let mo = 1; mo <= 12; mo += 1) {
        const dim = new Date(y, mo, 0).getDate();
        for (let day = 1; day <= dim; day += 1) {
          const ymd = `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          try {
            if (isoWeekPeriodKeyFromLocalYmd(ymd, tz) === targetKey) {
              return utcRangeForLocalIsoWeekContaining(ymd, tz);
            }
          } catch {
            /* invalid local date */
          }
        }
      }
      throw new Error(`Could not resolve week ${periodKey} in ${tz}`);
    }
    case 'MONTH': {
      const [y, mo] = periodKey.split('-').map(Number);
      const first = `${y}-${String(mo).padStart(2, '0')}-01`;
      return utcRangeForLocalMonthContaining(first, tz);
    }
    case 'YEAR': {
      const y = Number(periodKey);
      return utcRangeForLocalYearContaining(`${y}-06-15`, tz);
    }
    default:
      throw new Error(`Unknown periodType: ${periodType}`);
  }
}

export function resolvePeriodKeyForAnchor(
  periodType: LogPeriodSummaryType,
  anchorYmd: string,
  tz: string,
): string {
  switch (periodType) {
    case 'DAY':
      return anchorYmd;
    case 'WEEK':
      return isoWeekPeriodKeyFromLocalYmd(anchorYmd, tz);
    case 'MONTH':
      return monthPeriodKeyFromLocalYmd(anchorYmd);
    case 'YEAR':
      return yearPeriodKeyFromLocalYmd(anchorYmd);
    default:
      throw new Error(`Unknown periodType: ${periodType}`);
  }
}
