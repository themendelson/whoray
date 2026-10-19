import type { Registration } from "#parse/found.ts";

export type Facts = Pick<Registration, "expirationDate" | "updatedDate" | "released" | "deleted"> & {
  statuses: ReadonlySet<string>;
};

export type DropRule = (facts: Facts) => Date | undefined;

// When pendingDelete outlasts its window, updatedDate wasn't the deletion; count the observed
// expiry-to-drop cycle from the expiry instead.
const EXPIRY_TO_DROP_DAYS = 77;

export function redemptionGracePeriod(redemption: number, pendingDelete: number): DropRule {
  return ({ expirationDate, updatedDate, statuses }) => {
    if (!updatedDate) return undefined;
    if (statuses.has("redemptionPeriod")) return addDays(updatedDate, redemption);
    if (!statuses.has("pendingDelete")) return undefined;
    const pendingDeleteOver = addDays(updatedDate, pendingDelete).getTime() < Date.now();
    if (expirationDate && updatedDate > expirationDate && pendingDeleteOver) {
      return addDays(updatedDate, EXPIRY_TO_DROP_DAYS - daysBetween(updatedDate, expirationDate));
    }
    return addDays(updatedDate, pendingDelete);
  };
}

const holds = (statuses: ReadonlySet<string>, when: string[]): boolean =>
  when.length === 0 || when.some((status) => statuses.has(status));

export function afterExpiry(days: number, ...when: string[]): DropRule {
  return ({ expirationDate, statuses }) =>
    expirationDate && holds(statuses, when) ? addDays(expirationDate, days) : undefined;
}

export function afterUpdate(days: number, ...when: string[]): DropRule {
  return ({ updatedDate, statuses }) => (updatedDate && holds(statuses, when) ? addDays(updatedDate, days) : undefined);
}

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
