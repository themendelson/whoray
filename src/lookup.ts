import { availabilityConfirmedByWhois, servers } from "#data/servers.ts";
import type { Name } from "#domain.ts";
import { bySuffix, lastLabel, normalize } from "#domain.ts";
import type { Found, Registration } from "#parse/found.ts";
import { readRdap } from "#parse/rdap.ts";
import { toRecord } from "#parse/record.ts";
import { readWhois } from "#parse/whois.ts";
import { fetchRdap, ianaRdapBase } from "#rdap.ts";
import type { Connect, Hop, LookupOptions, ServerEntry, WhorayResult } from "#types.ts";
import { ianaWhoisHost, queryWhois } from "#whois.ts";

export type Lookup = (domain: string, options?: LookupOptions) => Promise<WhorayResult>;

interface Context {
  name: Name;
  entry: ServerEntry;
  registrar: boolean;
  connect: Connect;
  fetch: typeof fetch;
  signal: AbortSignal;
  hops: Hop[];
}

interface Outcome {
  found: Found;
  source: "rdap" | "whois";
}

export function createLookup(defaultConnect: Connect): Lookup {
  return async (domain, options = {}) => {
    options.signal?.throwIfAborted();
    const overrides = options.servers ?? {};
    const name = normalize(domain, (suffix) => Object.hasOwn(overrides, suffix));
    const timeout = AbortSignal.timeout(options.timeout ?? 10_000);
    const context: Context = {
      name,
      entry: { ...bySuffix(servers, name.tld), ...bySuffix(overrides, name.tld) },
      registrar: options.follow === "registrar",
      connect: options.connect ?? defaultConnect,
      fetch: options.fetch ?? globalThis.fetch,
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      hops: [],
    };
    const outcome = await resolve(context, options.rdap ?? "prefer", options.signal);
    options.signal?.throwIfAborted();
    return result(context, outcome);
  };
}

async function resolve(
  context: Context,
  mode: NonNullable<LookupOptions["rdap"]>,
  callerSignal: AbortSignal | undefined,
): Promise<Outcome | undefined> {
  const rdap = await attempt(context, callerSignal, "rdap", viaRdap);
  const confirm =
    rdap?.found.kind === "available" && availabilityConfirmedByWhois.has(context.hops.at(-1)?.server ?? "");
  const settled = rdap !== undefined && rdap.found.kind !== "error" && !confirm;
  const whois = settled || mode === "only" ? undefined : await attempt(context, callerSignal, "whois", viaWhois);
  if (confirm) return whois && marksAvailability(whois.found) ? whois : rdap;
  return pick(rdap, whois);
}

function pick(rdap: Outcome | undefined, whois: Outcome | undefined): Outcome | undefined {
  return whois && (whois.found.kind !== "error" || !rdap) ? whois : rdap;
}

function marksAvailability(found: Found): boolean {
  return (
    found.kind === "dropzone" || found.kind === "reserved" || (found.kind === "available" && found.premium === true)
  );
}

async function attempt(
  context: Context,
  callerSignal: AbortSignal | undefined,
  source: Outcome["source"],
  via: (context: Context) => Promise<Outcome | undefined>,
): Promise<Outcome | undefined> {
  try {
    return await via(context);
  } catch (error) {
    callerSignal?.throwIfAborted();
    if (context.signal.aborted)
      return { source, found: { kind: "error", code: "timeout", message: "Lookup timed out" } };
    return { source, found: { kind: "error", code: "network", message: String(error) } };
  }
}

function result(context: Context, outcome: Outcome | undefined): WhorayResult {
  const found: Found = outcome?.found ?? {
    kind: "error",
    code: "no_server",
    message: "No RDAP or WHOIS server for this TLD",
  };
  const record = { ...toRecord(context.name, found), source: outcome?.source ?? "whois", hops: context.hops } as const;
  if (found.kind !== "error") return record;
  const server = context.hops.at(-1)?.server;
  const error = {
    code: found.code,
    message: found.message,
    ...(server !== undefined && { server }),
    ...(found.retryAfter !== undefined && { retryAfter: found.retryAfter }),
  };
  return { ...record, error };
}

async function viaRdap(context: Context): Promise<Outcome | undefined> {
  const { name, entry, signal } = context;
  if (entry.rdap === false) return undefined;
  const base = entry.rdap ?? (await ianaRdapBase(context.fetch, lastLabel(name.tld), signal));
  if (base === undefined) return undefined;
  const found = await rdapHop(context, `${base}domain/${name.domain}`);
  if (found.kind !== "record" || !context.registrar || found.registrarRdap === undefined)
    return { found, source: "rdap" };
  const registrarHop = await rdapHop(context, found.registrarRdap).catch(() => undefined);
  return { found: merge(found, registrarHop), source: "rdap" };
}

async function rdapHop(context: Context, url: string): Promise<Found> {
  const host = new URL(url).host;
  const reply = await fetchRdap(context.fetch, url, context.signal);
  context.hops.push({ protocol: "rdap", server: host, raw: reply.body });
  if (reply.status === 404) return { kind: "available" };
  if (reply.status === 429) {
    return {
      kind: "error",
      code: "rate_limited",
      message: "HTTP 429",
      ...(reply.retryAfter !== undefined && { retryAfter: reply.retryAfter }),
    };
  }
  if (reply.status !== 200) return { kind: "error", code: "network", message: `HTTP ${reply.status}` };
  try {
    return readRdap(JSON.parse(reply.body));
  } catch {
    return { kind: "error", code: "unparseable", message: "RDAP reply is not JSON" };
  }
}

async function viaWhois(context: Context): Promise<Outcome> {
  const { name, entry, signal } = context;
  const host = entry.whois ?? (await ianaWhoisHost(context.connect, lastLabel(name.tld), signal));
  if (host === undefined)
    return { found: { kind: "error", code: "no_server", message: "IANA lists no WHOIS server" }, source: "whois" };
  const found = await whoisHop(context, host, (entry.query ?? "{domain}").replace("{domain}", name.domain));
  const referral = found.kind === "record" ? found.registrarWhois : undefined;
  if (found.kind !== "record" || !context.registrar || referral === undefined || referral === host)
    return { found, source: "whois" };
  const registrarHop = await whoisHop(context, referral, name.domain).catch(() => undefined);
  return { found: merge(found, registrarHop), source: "whois" };
}

async function whoisHop(context: Context, host: string, query: string): Promise<Found> {
  const ask = (): Promise<string> => queryWhois(context.connect, host, query, context.signal);
  const text = await ask().catch((error: unknown) => {
    if (context.signal.aborted) throw error;
    return ask();
  });
  context.hops.push({ protocol: "whois", server: host, raw: text });
  if (text.trim() === "") return { kind: "error", code: "rate_limited", message: "Empty reply, usually throttling" };
  return readWhois(text, context.name);
}

function merge(registry: Registration, registrarHop: Found | undefined): Registration {
  if (registrarHop?.kind !== "record" || !registrarHop.registrar) return registry;
  return { ...registry, registrar: { ...registrarHop.registrar, ...registry.registrar } };
}
