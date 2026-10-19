import { dropRules } from "#data/drop-rules.ts";
import type { Registry } from "#data/registries.ts";
import { registries, reservingRegistrars } from "#data/registries.ts";
import { servers } from "#data/servers.ts";
import { bySuffix } from "#domain.ts";
import type { Facts } from "#drop.ts";
import { afterExpiry, redemptionGracePeriod } from "#drop.ts";
import type { DomainState, Registrar } from "#types.ts";

const registryByTld: Readonly<Record<string, Registry>> = Object.fromEntries(
  registries.flatMap((registry) => registry.tlds.map((tld) => [tld, registry] as const)),
);
const defaultPeriods = afterExpiry(45 + 30 + 5);

export function registryOf(tld: string, id?: string): Registry | undefined {
  return bySuffix(registryByTld, tld) ?? registries.find((registry) => registry.id === id);
}

export function isKnownSuffix(suffix: string): boolean {
  return Object.hasOwn(servers, suffix) || Object.hasOwn(registryByTld, suffix) || Object.hasOwn(dropRules, suffix);
}

export function registryInText(text: string): Registry | undefined {
  return registries.find((registry) => registry.textPattern?.test(text) === true);
}

export function stateOf(
  statuses: ReadonlySet<string>,
  expirationDate: Date | undefined,
  registrar: Registrar | undefined,
): DomainState {
  if (registrar?.ianaId !== undefined && reservingRegistrars.has(registrar.ianaId)) return "reserved";
  if (statuses.has("redemptionPeriod")) return "redemption";
  if (statuses.has("pendingDelete")) return "pendingDelete";
  const renewed = statuses.has("autoRenewPeriod") || statuses.has("renewPeriod");
  if (expirationDate && expirationDate.getTime() < Date.now() && !renewed) return "expired";
  return "registered";
}

export function dropOf(tld: string, state: DomainState, facts: Facts, registry?: Registry): Date | undefined {
  if (state !== "expired" && state !== "redemption" && state !== "pendingDelete") return undefined;
  const schedule = registry ? redemptionGracePeriod(registry.redemption, registry.pendingDelete) : defaultPeriods;
  return bySuffix(dropRules, tld)?.(facts) ?? facts.released ?? schedule(facts);
}
