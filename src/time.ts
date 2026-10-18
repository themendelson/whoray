const DAY = 86_400_000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY);
}

export function daysBetween(later: Date, earlier: Date): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / DAY);
}

function startOfDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function atUtcHour(date: Date, hour: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour));
}

export function rolledPast(date: Date, hour: number): Date {
  return date.getUTCHours() >= hour ? addDays(date, 1) : date;
}

export function onOrAfterWeekday(date: Date, weekday: number): Date {
  return addDays(date, (weekday - date.getUTCDay() + 7) % 7);
}
