const DAY = 86_400_000;

const wallClockFormats = new Map<string, Intl.DateTimeFormat>();

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

export function fromWallClock(wallClock: number, timeZone: string): number {
  const offset = (at: number): number => wallClockAt(at, timeZone) - at;
  return wallClock - offset(wallClock - offset(wallClock));
}

function wallClockAt(at: number, timeZone: string): number {
  let format = wallClockFormats.get(timeZone);
  if (format === undefined) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    wallClockFormats.set(timeZone, format);
  }
  const parts = format.formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
}
