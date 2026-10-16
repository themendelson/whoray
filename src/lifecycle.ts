import { dropRules } from "#data/drop-rules.ts";
import type { Registry } from "#data/registries.ts";
import { bySuffix } from "#domain.ts";
import type { Facts } from "#drop.ts";
import { fixedPeriods, redemptionGracePeriod } from "#drop.ts";
import type { DomainState } from "#types.ts";

const defaultPeriods = fixedPeriods(45, 30, 5);

export function stateOf(statuses: ReadonlySet<string>, expirationDate: Date | undefined): DomainState {
  if (statuses.has("redemptionPeriod")) return "redemption";
  if (statuses.has("pendingDelete")) return "pendingDelete";
  const renewed = statuses.has("autoRenewPeriod") || statuses.has("renewPeriod");
  if (expirationDate && expirationDate.getTime() < Date.now() && !renewed) return "expired";
  return "registered";
}

const DROPZONE_HOLD_HOURS = 12;

export interface DropDates {
  dropDate: Date;
  deletionDate?: Date;
}

export function dropOf(tld: string, state: DomainState, facts: Facts, registry?: Registry): DropDates | undefined {
  if (state !== "expired" && state !== "redemption" && state !== "pendingDelete") return undefined;
  const fromTld = bySuffix(dropRules, tld)?.(facts);
  if (fromTld) return { dropDate: fromTld };
  if (facts.released) return { dropDate: facts.released };
  const fromRegistry = registry && redemptionGracePeriod(registry.redemption, registry.pendingDelete)(facts);
  if (fromRegistry && registry.dropzone === true) {
    return { dropDate: new Date(fromRegistry.getTime() + DROPZONE_HOLD_HOURS * 3_600_000), deletionDate: fromRegistry };
  }
  const dropDate = registry ? fromRegistry : defaultPeriods(facts);
  return dropDate && { dropDate };
}
