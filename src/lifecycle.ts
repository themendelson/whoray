import { dropRules } from "#data/drop-rules.ts";
import { servers } from "#data/servers.ts";
import type { Registry } from "#data/registries.ts";
import { registries } from "#data/registries.ts";
import { bySuffix } from "#domain.ts";
import type { Facts } from "#drop.ts";
import { fixedPeriods, redemptionGracePeriod } from "#drop.ts";
import type { DomainState } from "#types.ts";

const registryByTld: Readonly<Record<string, Registry>> = Object.fromEntries(
  registries.flatMap((registry) => registry.tlds.map((tld) => [tld, registry] as const)),
);
const defaultPeriods = fixedPeriods(45, 30, 5);

export function registryOf(tld: string, id?: string): Registry | undefined {
  return bySuffix(registryByTld, tld) ?? registries.find((registry) => registry.id === id);
}

export function isKnownSuffix(suffix: string): boolean {
  return Object.hasOwn(servers, suffix) || Object.hasOwn(registryByTld, suffix) || Object.hasOwn(dropRules, suffix);
}

export function registryInText(text: string): Registry | undefined {
  return registries.find((registry) => registry.textPattern?.test(text) === true);
}

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
