import type { Drop } from "#types.ts";

export interface Facts {
  expires?: Date;
  updated?: Date;
  released?: Date;
  deleted?: Date;
  statuses: ReadonlySet<string>;
}

export type DropRule = (facts: Facts) => Drop | undefined;

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

export function tldRule(at: Date | undefined): Drop | undefined {
  return at && { at, confidence: "high", basis: "tld schedule" };
}

export function redemptionGracePeriod(redemption: number, pendingDelete: number): DropRule {
  return ({ expires, updated, statuses }) => {
    if (!updated) return undefined;
    const basis = "registry schedule";
    if (statuses.has("redemptionPeriod")) {
      const days = statuses.has("pendingDelete") ? redemption + pendingDelete : redemption;
      return { at: addDays(updated, days), confidence: "high", basis };
    }
    if (!statuses.has("pendingDelete")) return undefined;
    const pendingDeleteOver = addDays(updated, pendingDelete).getTime() < Date.now();
    if (expires && updated > expires && pendingDeleteOver) {
      return { at: addDays(updated, 77 - daysBetween(updated, expires)), confidence: "low", basis };
    }
    return { at: addDays(updated, pendingDelete), confidence: "high", basis };
  };
}

export function fixedPeriods(grace: number, redemption: number, pendingDelete: number): DropRule {
  return ({ expires }) =>
    expires && {
      at: addDays(expires, grace + redemption + pendingDelete),
      confidence: "low",
      basis: "expiry + periods",
    };
}
