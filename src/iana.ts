import { untilAborted } from "#abort.ts";
import { object, strings } from "#json.ts";
import type { Connect } from "#types.ts";
import { queryWhois } from "#whois/query.ts";

const BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const IANA_TIMEOUT = 10_000;

const bootstraps = new Map<string, Promise<ReadonlyMap<string, string>>>();
const whoisHosts = new Map<string, Promise<string | undefined>>();

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const bases = shared(bootstraps, BOOTSTRAP_URL, () => loadBootstrap(fetcher, AbortSignal.timeout(IANA_TIMEOUT)));
  return (await untilAborted(bases, signal)).get(tld);
}

export function ianaWhoisHost(connect: Connect, tld: string, signal: AbortSignal): Promise<string | undefined> {
  const host = shared(whoisHosts, tld, async () =>
    whoisHostIn(await queryWhois(connect, "whois.iana.org", tld, AbortSignal.timeout(IANA_TIMEOUT))),
  );
  return untilAborted(host, signal);
}

// One request serves every lookup waiting on it, so it runs on its own deadline rather than the
// first caller's; a failed one is dropped so the next lookup asks again.
function shared<T>(cache: Map<string, Promise<T>>, key: string, load: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const loading = load().catch((error: unknown) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, loading);
  return loading;
}

async function loadBootstrap(fetcher: typeof fetch, signal: AbortSignal): Promise<Map<string, string>> {
  const response = await fetcher(BOOTSTRAP_URL, { signal });
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
