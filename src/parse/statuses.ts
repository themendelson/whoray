import { eppStatuses, statusSynonyms } from "#data/statuses.ts";

const key = (status: string): string => status.toLowerCase().replace(/[\s_-]+/g, "");

const eppByKey = new Map<string, string>([
  ...eppStatuses.map((code) => [key(code), code] as const),
  ...Object.entries(statusSynonyms).map(([words, code]) => [key(words), code] as const),
]);

function statusesIn(value: string): string[] {
  const whole = eppByKey.get(key(value));
  if (whole !== undefined) return [whole];
  return value.split(/\s+/).flatMap((word) => eppByKey.get(key(word)) ?? []);
}

export function normalizeStatuses(values: string[]): string[] {
  const statuses = values
    .flatMap((value) => value.split(","))
    .flatMap((value) => statusesIn(value.trim().split(/\s+(?:\(|https?:)/)[0] ?? ""));
  const unique = [...new Set(statuses)];
  // EPP's ok means no other status applies (RFC 5731), so a registry's "active" beside a lock isn't ok.
  return unique.length > 1 ? unique.filter((status) => status !== "ok") : unique;
}
