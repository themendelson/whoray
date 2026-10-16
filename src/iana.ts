import { object, strings } from "#json.ts";
import { Memo } from "#memo.ts";
import { DAY } from "#time.ts";
import type { Connect } from "#types.ts";
import { queryWhois } from "#whois.ts";

const TIMEOUT = 15_000;
const rdapBases = new Memo<ReadonlyMap<string, string>>(DAY);
const whoisHosts = new Memo<string | undefined>(DAY);

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const bases = await rdapBases.get("dns", () => loadBootstrap(fetcher), signal);
  return bases.get(tld);
}

export function ianaWhoisHost(connect: Connect, tld: string, signal: AbortSignal): Promise<string | undefined> {
  const load = (): Promise<string | undefined> =>
    queryWhois(connect, "whois.iana.org", tld, AbortSignal.timeout(TIMEOUT)).then(whoisHostIn);
  return whoisHosts.get(tld, load, signal);
}

async function loadBootstrap(fetcher: typeof fetch): Promise<Map<string, string>> {
  const response = await fetcher("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(TIMEOUT) });
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
