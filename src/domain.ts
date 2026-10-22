import { words } from "#data/lists.ts";
import { secondLevelSuffixes } from "#data/suffixes.ts";
import { decodePunycode } from "#utils/punycode.ts";
import { parseUrl } from "#utils/url.ts";

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const NOT_A_HOSTNAME = /[\s/\\:@?#%]/;

const suffixRules = new Set(
  Object.entries(secondLevelSuffixes).flatMap(([tld, rules]) => words(rules).map((rule) => `${rule}.${tld}`)),
);

export interface Name {
  domain: string;
  unicode: string;
  tld: string;
}

export function normalize(input: string, isKnownSuffix: (suffix: string) => boolean): Name {
  const trimmed = input.trim().toLowerCase().replace(/\.$/, "");
  const ascii = NOT_A_HOSTNAME.test(trimmed) ? "" : (parseUrl(`http://${trimmed}`)?.hostname ?? "");
  const labels = ascii.split(".");
  const valid = labels.length > 1 && ascii.length <= 253 && !/^\d+$/.test(lastLabel(ascii));
  if (!valid || !labels.every((label) => LABEL.test(label))) throw new TypeError(`Not a domain name: "${input}"`);
  const registrable = registrableLabels(labels, isKnownSuffix);
  const domain = registrable.join(".");
  return { domain, unicode: toUnicode(domain), tld: suffixOf(registrable, isKnownSuffix) };
}

export function lastLabel(suffix: string): string {
  return suffix.slice(suffix.lastIndexOf(".") + 1);
}

export function bySuffix<T>(table: Readonly<Record<string, T>>, suffix: string): T | undefined {
  for (let candidate = suffix; ; candidate = candidate.slice(candidate.indexOf(".") + 1)) {
    if (Object.hasOwn(table, candidate)) return table[candidate];
    if (!candidate.includes(".")) return undefined;
  }
}

function registrableLabels(labels: string[], isKnownSuffix: (suffix: string) => boolean): string[] {
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join(".");
    if (suffixRules.has(`!${candidate}`)) return labels.slice(i);
    if (i > 0 && (isKnownSuffix(candidate) || isPublicSuffix(candidate))) return labels.slice(i - 1);
  }
  return labels.slice(-2);
}

function isPublicSuffix(name: string): boolean {
  return suffixRules.has(name) || suffixRules.has(`*.${name.slice(name.indexOf(".") + 1)}`);
}

function suffixOf(labels: string[], isKnownSuffix: (suffix: string) => boolean): string {
  for (let i = 1; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join(".");
    if (isKnownSuffix(candidate)) return candidate;
  }
  return labels.at(-1) ?? "";
}

function toUnicode(domain: string): string {
  return domain
    .split(".")
    .map((label) => (label.startsWith("xn--") ? (decodePunycode(label.slice(4)) ?? label) : label))
    .join(".");
}
