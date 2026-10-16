import { object, strings } from "#json.ts";

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

let bootstrap: Promise<Map<string, string>> | undefined;

export async function ianaRdapBase(
  fetcher: typeof fetch,
  tld: string,
  signal: AbortSignal,
): Promise<string | undefined> {
  bootstrap ??= loadBootstrap(fetcher, signal).catch((error: unknown) => {
    bootstrap = undefined;
    throw error;
  });
  return (await bootstrap).get(tld);
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
    for (const tld of strings(service[0])) bases.set(tld, base.endsWith("/") ? base : `${base}/`);
  }
  return bases;
}
