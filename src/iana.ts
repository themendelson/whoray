import { object, strings } from "#json.ts";
import { DAY } from "#time.ts";
import type { Connect } from "#types.ts";
import { queryWhois } from "#whois.ts";

interface Cached<T> {
  value: T;
  until: number;
}

let rdapBases: Cached<ReadonlyMap<string, string>> | undefined;
const whoisHosts = new Map<string, Cached<string | undefined>>();

const fresh = <T>(entry: Cached<T> | undefined): entry is Cached<T> => entry !== undefined && entry.until > Date.now();
const forADay = <T>(value: T): Cached<T> => ({ value, until: Date.now() + DAY });

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  if (!fresh(rdapBases)) rdapBases = forADay(await loadBootstrap(fetcher, signal));
  return rdapBases.value.get(tld);
}

export async function ianaWhoisHost(connect: Connect, tld: string, signal: AbortSignal): Promise<string | undefined> {
  const cached = whoisHosts.get(tld);
  if (fresh(cached)) return cached.value;
  const host = whoisHostIn(await queryWhois(connect, "whois.iana.org", tld, signal));
  whoisHosts.set(tld, forADay(host));
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
