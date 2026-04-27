export function deriveTargetsFromDaily(daily: number): {
  day: number;
  week: number;
  month: number;
  year: number;
} {
  const base = Math.max(1, Math.floor(daily));
  return {
    day: base,
    week: base * 7,
    month: base * 30,
    year: base * 365,
  };
}

