import { writeFile } from "node:fs/promises";
import { domainToASCII } from "node:url";

const response = await fetch("https://publicsuffix.org/list/public_suffix_list.dat");
if (!response.ok) throw new Error(`publicsuffix.org returned HTTP ${response.status}`);
const list = await response.text();
const icann = /===BEGIN ICANN DOMAINS===([\s\S]*?)===END ICANN DOMAINS===/.exec(list)?.[1];
if (icann === undefined) throw new Error("No ICANN section in the public suffix list");

const toAscii = (label: string): string => (/^[!*]|^[\x20-\x7e]+$/.test(label) ? label : domainToASCII(label));
const byTld = new Map<string, string[]>();
for (const line of icann.split("\n")) {
  const rule = line.trim();
  if (rule === "" || rule.startsWith("//") || !rule.includes(".")) continue;
  const prefix = rule.startsWith("!") ? "!" : "";
  const labels = rule.slice(prefix.length).split(".").map(toAscii);
  const tld = labels.pop() ?? "";
  byTld.set(tld, [...(byTld.get(tld) ?? []), `${prefix}${labels.join(".")}`]);
}

const entries = [...byTld]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([tld, rules]) => `  ${/^[a-z]\w*$/.test(tld) ? tld : `"${tld}"`}: "${rules.join(" ")}",`);
const source = ["export const suffixes: Readonly<Record<string, string>> = {", ...entries, "};", ""].join("\n");
await writeFile("src/data/suffixes.ts", source);
console.log(`${entries.length} TLDs with multi-label suffixes`);
