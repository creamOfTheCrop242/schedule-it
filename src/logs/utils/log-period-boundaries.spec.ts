import {
  isoWeekPeriodKeyFromLocalYmd,
  localYesterdayYmd,
  monthPeriodKeyFromLocalYmd,
  resolvePeriodKeyForAnchor,
  utcRangeForLocalDay,
  yearPeriodKeyFromLocalYmd,
} from './log-period-boundaries';

describe('log-period-boundaries', () => {
  const tz = 'America/New_York';

  it('localYesterdayYmd returns yyyy-MM-dd before today in zone', () => {
    const anchor = new Date('2026-05-10T12:00:00.000Z');
    expect(localYesterdayYmd(anchor, 'UTC')).toBe('2026-05-09');
  });

  it('month and year keys from ymd', () => {
    expect(monthPeriodKeyFromLocalYmd('2026-03-15')).toBe('2026-03');
    expect(yearPeriodKeyFromLocalYmd('2026-03-15')).toBe('2026');
  });

  it('resolvePeriodKeyForAnchor day returns anchor', () => {
    expect(resolvePeriodKeyForAnchor('DAY', '2026-04-01', tz)).toBe('2026-04-01');
  });

  it('utcRangeForLocalDay end is one day after start', () => {
    const { startUtc, endUtc } = utcRangeForLocalDay('2026-06-01', 'UTC');
    expect(endUtc.getTime() - startUtc.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('isoWeekPeriodKeyFromLocalYmd matches resolvePeriodKeyForAnchor week', () => {
    const ymd = '2026-05-06';
    expect(isoWeekPeriodKeyFromLocalYmd(ymd, tz)).toBe(
      resolvePeriodKeyForAnchor('WEEK', ymd, tz),
    );
  });
});
