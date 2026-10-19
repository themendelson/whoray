const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const ZONE_MINUTES: Record<string, number> = {
  utc: 0,
  gmt: 0,
  z: 0,
  bst: 60,
  cet: 60,
  cest: 120,
  eet: 120,
  eest: 180,
  msk: 180,
  ict: 420,
  hkt: 480,
  sgt: 480,
  jst: 540,
  kst: 540,
  aest: 600,
  clt: -240,
  clst: -180,
  est: -300,
  edt: -240,
  pst: -480,
  pdt: -420,
};

const NUMERIC_DAY_MONTH_YEAR = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})(.*)$/;

const PATTERNS: [pattern: RegExp, year: number, month: number, day: number][] = [
  [/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(.*)$/, 1, 2, 3],
  [/^(\d{4})-([a-z]{3})-(\d{1,2})(.*)$/i, 1, 2, 3],
  [NUMERIC_DAY_MONTH_YEAR, 3, 2, 1],
  [NUMERIC_DAY_MONTH_YEAR, 3, 1, 2],
  [/^(\d{1,2})[-\s.]+([a-z]{3})[a-z]*\.?[-\s.,]+(\d{4})(.*)$/i, 3, 2, 1],
  [/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})(.*)$/i, 3, 1, 2],
  [/^(\d{4})(\d{2})(\d{2})(\D.*)?$/, 1, 2, 3],
];

export function parseDate(input: string): Date | undefined {
  const value = input
    .trim()
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(/^[a-z]{3},?\s+(?=[a-z]{3}\s)/i, "")
    .replace(/^([a-z]{3}\s+\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+(\d{4})\b/i, "$1 $3 $2");
  for (const [pattern, year, month, day] of PATTERNS) {
    const match = pattern.exec(value);
    const date = match && build(match, Number(match[year]), monthOf(match[month] ?? ""), Number(match[day]));
    if (date) return date;
  }
  return undefined;
}

function monthOf(text: string): number {
  return /^\d+$/.test(text) ? Number(text) : MONTHS.indexOf(text.toLowerCase()) + 1;
}

function build(match: RegExpExecArray, year: number, month: number, day: number): Date | undefined {
  const rest = match[4] ?? "";
  const time = /(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([ap])\.?m\b)?/i.exec(rest);
  const meridiem = time?.[4]?.toLowerCase();
  const hour = (Number(time?.[1] ?? 0) % (meridiem === undefined ? 24 : 12)) + (meridiem === "p" ? 12 : 0);
  const date = new Date(Date.UTC(year, month - 1, day, hour, Number(time?.[2] ?? 0), Number(time?.[3] ?? 0)));
  const valid = month >= 1 && month <= 12 && date.getUTCDate() === day && date.getUTCMonth() === month - 1;
  return valid ? new Date(date.getTime() - offsetMinutes(rest) * 60_000) : undefined;
}

function offsetMinutes(rest: string): number {
  const numeric = /(?:utc|gmt)?([+-])(\d{1,2}):?(\d{2})?\)?\s*$/i.exec(rest);
  if (numeric) return (numeric[1] === "-" ? -1 : 1) * (Number(numeric[2]) * 60 + Number(numeric[3] ?? 0));
  const named = /\(?([a-z]{1,5})\)?\s*$/i.exec(rest)?.[1]?.toLowerCase();
  return named === undefined ? 0 : (ZONE_MINUTES[named] ?? 0);
}
