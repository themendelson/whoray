const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export interface Name {
  domain: string;
  unicode: string;
  tld: string;
}

export function normalize(input: string, isKnownSuffix: (suffix: string) => boolean): Name {
  const trimmed = input.trim().toLowerCase().replace(/\.$/, "");
  if (/[\s/:@?#]/.test(trimmed)) throw new TypeError(`Not a domain name: "${input}"`);
  let ascii: string;
  try {
    ascii = new URL(`http://${trimmed}`).hostname;
  } catch {
    throw new TypeError(`Not a domain name: "${input}"`);
  }
  const labels = ascii.split(".");
  const tldLabel = labels.at(-1) ?? "";
  if (labels.length < 2 || ascii.length > 253 || /^\d+$/.test(tldLabel) || !labels.every((l) => LABEL.test(l))) {
    throw new TypeError(`Not a domain name: "${input}"`);
  }
  return { domain: ascii, unicode: toUnicode(ascii), tld: suffixOf(labels, isKnownSuffix) };
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

const BASE = 36;
const T_MIN = 1;
const T_MAX = 26;

function adapt(delta: number, points: number, first: boolean): number {
  let d = first ? Math.floor(delta / 700) : delta >> 1;
  d += Math.floor(d / points);
  let k = 0;
  while (d > ((BASE - T_MIN) * T_MAX) >> 1) {
    d = Math.floor(d / (BASE - T_MIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - T_MIN + 1) * d) / (d + 38));
}

function digitValue(code: number): number {
  if (code >= 48 && code <= 57) return code - 22;
  if (code >= 97 && code <= 122) return code - 97;
  return BASE;
}

function decodePunycode(input: string): string | undefined {
  const delimiter = input.lastIndexOf("-");
  const output = input
    .slice(0, Math.max(delimiter, 0))
    .split("")
    .map((c) => c.charCodeAt(0));
  let n = 128;
  let bias = 72;
  let i = 0;
  let pos = delimiter > 0 ? delimiter + 1 : 0;
  while (pos < input.length) {
    const previous = i;
    let weight = 1;
    for (let k = BASE; ; k += BASE) {
      const digit = digitValue(input.charCodeAt(pos++));
      if (digit >= BASE) return undefined;
      i += digit * weight;
      const threshold = k <= bias ? T_MIN : k >= bias + T_MAX ? T_MAX : k - bias;
      if (digit < threshold) break;
      weight *= BASE - threshold;
    }
    const length = output.length + 1;
    bias = adapt(i - previous, length, previous === 0);
    n += Math.floor(i / length);
    i %= length;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}
