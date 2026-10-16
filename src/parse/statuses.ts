import { eppStatuses, statusSynonyms } from "#data/statuses.ts";

const key = (status: string): string => status.toLowerCase().replace(/[\s_-]+/g, "");

const eppByKey = new Map<string, string>([
  ...eppStatuses.map((code) => [key(code), code] as const),
  ...Object.entries(statusSynonyms).map(([words, code]) => [key(words), code] as const),
]);

export function normalizeStatuses(values: string[]): string[] {
  const statuses = values
    .flatMap((value) => value.split(","))
    .flatMap((value) => eppByKey.get(key(value.trim().split(/\s+(?:\(|https?:)/)[0] ?? "")) ?? []);
  return [...new Set(statuses)];
}
