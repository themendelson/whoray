import type { Registration } from "#parse/found.ts";
import { addDays, daysBetween } from "#time.ts";

export type Facts = Pick<Registration, "expirationDate" | "updatedDate" | "released" | "deleted"> & {
  statuses: ReadonlySet<string>;
};

export type DropRule = (facts: Facts) => Date | undefined;

export function redemptionGracePeriod(redemption: number, pendingDelete: number): DropRule {
  return ({ expirationDate, updatedDate, statuses }) => {
    if (!updatedDate) return undefined;
    if (statuses.has("redemptionPeriod")) {
      return addDays(updatedDate, statuses.has("pendingDelete") ? redemption + pendingDelete : redemption);
    }
    if (!statuses.has("pendingDelete")) return undefined;
    const pendingDeleteOver = addDays(updatedDate, pendingDelete).getTime() < Date.now();
    if (expirationDate && updatedDate > expirationDate && pendingDeleteOver)
      return addDays(updatedDate, 77 - daysBetween(updatedDate, expirationDate));
    return addDays(updatedDate, pendingDelete);
  };
}

export function fixedPeriods(grace: number, redemption: number, pendingDelete: number): DropRule {
  return ({ expirationDate }) => expirationDate && addDays(expirationDate, grace + redemption + pendingDelete);
}
