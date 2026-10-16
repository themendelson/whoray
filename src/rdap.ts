import { object, strings } from "#json.ts";
import { Memo } from "#memo.ts";

export interface RdapReply {
  url: string;
  status: number;
  body: string;
  retryAfter?: number;
}

export async function fetchRdap(fetcher: typeof fetch, url: string, signal: AbortSignal): Promise<RdapReply> {
  const response = await fetcher(url, { headers: { accept: "application/rdap+json" }, signal });
  const body = await response.text();
  const retryAfter = Number(response.headers.get("retry-after"));
  return { url, status: response.status, body, ...(retryAfter > 0 && { retryAfter }) };
}

const DAY = 86_400_000;
const IANA_TIMEOUT = 15_000;
const bootstrap = new Memo<ReadonlyMap<string, string>>(DAY);

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  const bases = await bootstrap.get("dns", () => loadBootstrap(fetcher), signal);
  return bases.get(tld);
}

async function loadBootstrap(fetcher: typeof fetch): Promise<Map<string, string>> {
  const response = await fetcher("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(IANA_TIMEOUT) });
  if (!response.ok) throw new Error(`IANA RDAP bootstrap returned HTTP ${response.status}`);
  const json: unknown = await response.json();
  const bases = new Map<string, string>();
  const services = object(json)?.services;
  for (const service of Array.isArray(services) ? services : []) {
    if (!Array.isArray(service)) continue;
    const urls = strings(service[1]);
    const base = urls.find((url) => url.startsWith("https://")) ?? urls[0];
    if (base === undefined) continue;
    for (const tld of strings(service[0])) bases.set(tld, base.endsWith("/") ? base : `${base}/`);
  }
  return bases;
}
