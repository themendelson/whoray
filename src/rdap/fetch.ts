import type { Found } from "#parse/found.ts";
import { readRdap } from "#rdap/parse.ts";

export interface RdapReply {
  status: number;
  body: string;
  retryAfter?: number | undefined;
}

export async function fetchRdap(fetcher: typeof fetch, url: string, signal: AbortSignal): Promise<RdapReply> {
  const response = await fetcher(url, { headers: { accept: "application/rdap+json" }, signal });
  const body = await response.text();
  const retryAfter = Number(response.headers.get("retry-after"));
  return { status: response.status, body, retryAfter: retryAfter > 0 ? retryAfter : undefined };
}

export function readRdapReply({ status, body, retryAfter }: RdapReply): Found {
  if (status === 404) return { kind: "available" };
  if (status === 429) {
    return {
      kind: "error",
      code: "rate_limited",
      message: "HTTP 429",
      retryAfter,
    };
  }
  if (status !== 200) return { kind: "error", code: "network", message: `HTTP ${status}` };
  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { kind: "error", code: "unparseable", message: "RDAP reply is not JSON" };
  }
  return readRdap(json);
}
