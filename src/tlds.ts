import { dropRules } from "#data/drop-rules.ts";
import type { Registry } from "#data/registries.ts";
import { registries } from "#data/registries.ts";
import { servers } from "#data/servers.ts";
import { bySuffix } from "#domain.ts";

const registryByTld: Readonly<Record<string, Registry>> = Object.fromEntries(
  registries.flatMap((registry) => registry.tlds.map((tld) => [tld, registry] as const)),
);

export function registryOf(tld: string, id?: string): Registry | undefined {
  return bySuffix(registryByTld, tld) ?? registries.find((registry) => registry.id === id);
}

export function registryInText(text: string): Registry | undefined {
  return registries.find((registry) => registry.textPattern?.test(text) === true);
}

export function isKnownSuffix(suffix: string): boolean {
  return Object.hasOwn(servers, suffix) || Object.hasOwn(registryByTld, suffix) || Object.hasOwn(dropRules, suffix);
}
