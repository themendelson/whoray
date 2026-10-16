import { dropRules } from "#data/drop-rules.ts";
import type { Registry } from "#data/registries.ts";
import { registries } from "#data/registries.ts";
import type { Facts } from "#drop.ts";
import { fixedPeriods, redemptionGracePeriod } from "#drop.ts";
import type { DomainState, Drop } from "#types.ts";

const registryByTld = new Map(registries.flatMap((registry) => registry.tlds.map((tld) => [tld, registry] as const)));
const defaultPeriods = fixedPeriods(45, 30, 5);

export function registryOf(tld: string, id?: string): Registry | undefined {
  return (
    registryByTld.get(tld) ?? registryByTld.get(lastLabel(tld)) ?? registries.find((registry) => registry.id === id)
  );
}

export function registryInText(text: string): Registry | undefined {
  return registries.find((registry) => registry.textPattern?.test(text) === true);
}

export function hasLifecycleData(suffix: string): boolean {
  return registryByTld.has(suffix) || suffix in dropRules;
}

export function lastLabel(tld: string): string {
  return tld.slice(tld.lastIndexOf(".") + 1);
}

export function stateOf(statuses: ReadonlySet<string>, expires: Date | undefined): DomainState {
  if (statuses.has("redemptionPeriod")) return "redemption";
  if (statuses.has("pendingDelete")) return "pendingDelete";
  if (expires && expires.getTime() < Date.now()) return "expired";
  return "registered";
}

const DROPZONE_HOLD_HOURS = 12;

export function dropOf(tld: string, state: DomainState, facts: Facts, registry?: Registry): Drop | undefined {
  if (state !== "expired" && state !== "redemption" && state !== "pendingDelete") return undefined;
  const fromTld = (dropRules[tld] ?? dropRules[lastLabel(tld)])?.(facts);
  if (fromTld) return fromTld;
  if (facts.released) return { at: facts.released, confidence: "high", basis: "registry date" };
  const fromRegistry = registry && redemptionGracePeriod(registry.redemption, registry.pendingDelete)(facts);
  if (fromRegistry && registry.dropzone === true) {
    const at = new Date(fromRegistry.at.getTime() + DROPZONE_HOLD_HOURS * 3_600_000);
    return { ...fromRegistry, at, deletion: fromRegistry.at };
  }
  return fromRegistry ?? defaultPeriods(facts);
}
