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

interface Parts {
  year: number;
  month: number;
  day: number;
  rest: string;
}

const PATTERNS: ((value: string) => Parts | undefined)[] = [
  (value) => parts(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(.*)$/.exec(value), 1, 2, 3),
  (value) => parts(/^(\d{4})-([a-z]{3})-(\d{1,2})(.*)$/i.exec(value), 1, 2, 3),
  (value) => parts(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})(.*)$/.exec(value), 3, 2, 1),
  (value) => parts(/^(\d{1,2})[-\s.]+([a-z]{3})[a-z]*\.?[-\s.,]+(\d{4})(.*)$/i.exec(value), 3, 2, 1),
  (value) => parts(/^([a-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})(.*)$/i.exec(value), 3, 1, 2),
  (value) => parts(/^(\d{4})(\d{2})(\d{2})(\D.*)?$/.exec(value), 1, 2, 3),
];

function parts(match: RegExpExecArray | null, year: number, month: number, day: number): Parts | undefined {
  if (!match) return undefined;
  const monthText = match[month] ?? "";
  const monthNumber = /^\d+$/.test(monthText) ? Number(monthText) : MONTHS.indexOf(monthText.toLowerCase()) + 1;
  return { year: Number(match[year]), month: monthNumber, day: Number(match[day]), rest: match[4] ?? "" };
}

export function parseDate(input: string): Date | undefined {
  const value = input
    .trim()
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(/^[a-z]{3},?\s+(?=[a-z]{3}\s)/i, "");
  for (const pattern of PATTERNS) {
    const found = pattern(value);
    if (found) return build(found);
  }
  return undefined;
}

function build({ year, month, day, rest }: Parts): Date | undefined {
  const time = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(rest);
  const date = new Date(
    Date.UTC(year, month - 1, day, Number(time?.[1] ?? 0), Number(time?.[2] ?? 0), Number(time?.[3] ?? 0)),
  );
  const valid = month >= 1 && month <= 12 && date.getUTCDate() === day && date.getUTCMonth() === month - 1;
  return valid ? new Date(date.getTime() - offsetMinutes(rest) * 60_000) : undefined;
}

function offsetMinutes(rest: string): number {
  const numeric = /(?:utc|gmt)?([+-])(\d{1,2}):?(\d{2})?\)?\s*$/i.exec(rest);
  if (numeric) return (numeric[1] === "-" ? -1 : 1) * (Number(numeric[2]) * 60 + Number(numeric[3] ?? 0));
  const named = /\(?([a-z]{1,5})\)?\s*$/i.exec(rest)?.[1]?.toLowerCase();
  return named === undefined ? 0 : (ZONE_MINUTES[named] ?? 0);
}
