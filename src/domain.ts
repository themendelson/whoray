import { words } from "#data/lists.ts";
import { tldsWithSecondLevelSuffixes } from "#data/suffixes.ts";
import { decodePunycode } from "#utils/punycode.ts";
import { parseUrl } from "#utils/url.ts";

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const NOT_A_HOSTNAME = /[\s/\\:@?#%]/;
const SECOND_LEVEL_TLDS: ReadonlySet<string> = new Set(words(tldsWithSecondLevelSuffixes));

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
  const tld = suffixOf(labels, isKnownSuffix);
  const domain = registrable(labels, tld);
  return { domain, unicode: toUnicode(domain), tld };
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

function registrable(labels: string[], tld: string): string {
  const unambiguous = tld.includes(".") || !SECOND_LEVEL_TLDS.has(tld);
  return labels.slice(unambiguous ? -tld.split(".").length - 1 : 0).join(".");
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
