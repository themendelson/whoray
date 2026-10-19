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

export function decodePunycode(input: string): string | undefined {
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
