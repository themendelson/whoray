import { decodePunycode } from "#utils/punycode.ts";
import { parseUrl } from "#utils/url.ts";

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const NOT_A_HOSTNAME = /[\s/\\:@?#%]/;

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
  return { domain: ascii, unicode: toUnicode(ascii), tld: suffixOf(labels, isKnownSuffix) };
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
