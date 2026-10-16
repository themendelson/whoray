import { object, strings } from "#json.ts";
import type { Connect } from "#types.ts";
import { queryWhois } from "#whois.ts";

let rdapBases: ReadonlyMap<string, string> | undefined;
const whoisHosts = new Map<string, string | undefined>();

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  rdapBases ??= await loadBootstrap(fetcher, signal);
  return rdapBases.get(tld);
}

export async function ianaWhoisHost(connect: Connect, tld: string, signal: AbortSignal): Promise<string | undefined> {
  if (whoisHosts.has(tld)) return whoisHosts.get(tld);
  const host = whoisHostIn(await queryWhois(connect, "whois.iana.org", tld, signal));
  whoisHosts.set(tld, host);
  return host;
}

async function loadBootstrap(fetcher: typeof fetch, signal: AbortSignal): Promise<Map<string, string>> {
  const response = await fetcher("https://data.iana.org/rdap/dns.json", { signal });
  if (!response.ok) throw new Error(`IANA RDAP bootstrap returned HTTP ${response.status}`);
  const json: unknown = await response.json();
  const bases = new Map<string, string>();
  const services = object(json)?.services;
  for (const service of Array.isArray(services) ? services : []) {
    if (!Array.isArray(service)) continue;
    const urls = strings(service[1]);
    const base = urls.find((url) => url.startsWith("https://")) ?? urls[0];
    if (base === undefined) continue;
    for (const tld of strings(service[0])) bases.set(tld, base);
  }
  return bases;
}

function whoisHostIn(reply: string): string | undefined {
  if (!/^domain:|returned 0 objects/m.test(reply)) throw new Error("whois.iana.org sent no TLD record");
  return /^whois:[ \t]*(\S+)/m.exec(reply)?.[1]?.toLowerCase();
}
