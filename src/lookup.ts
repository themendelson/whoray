import { servers } from "#data/servers.ts";
import type { Name } from "#domain.ts";
import { bySuffix, lastLabel, normalize } from "#domain.ts";
import type { Found, Registration } from "#parse/found.ts";
import { readRdap } from "#parse/rdap.ts";
import { toRecord } from "#parse/record.ts";
import { readWhois } from "#parse/whois.ts";
import type { RdapReply } from "#rdap.ts";
import { fetchRdap, ianaRdapBase } from "#rdap.ts";
import type { Connect, Hop, LookupOptions, Protocol, ServerEntry, WhorayResult } from "#types.ts";
import { ianaWhoisHost, queryWhois } from "#whois.ts";

export type Lookup = (domain: string, options?: LookupOptions) => Promise<WhorayResult>;

interface Context {
  name: Name;
  entry: ServerEntry;
  registrar: boolean;
  connect: Connect;
  fetch: typeof fetch;
  caller: AbortSignal | undefined;
  signal: AbortSignal;
  timeout: number;
  hops: Hop[];
}

interface Outcome {
  found: Found;
  source: Protocol;
}

const DEFAULT_TIMEOUT = 10_000;
const NO_SERVER: Found = { kind: "error", code: "no_server", message: "No WHOIS or RDAP server is known for this TLD" };

export function createLookup(defaultConnect: Connect): Lookup {
  return async (domain, options = {}) => {
    options.signal?.throwIfAborted();
    const overrides = options.servers ?? {};
    const name = normalize(domain, (suffix) => Object.hasOwn(overrides, suffix));
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    const deadline = AbortSignal.timeout(timeout);
    const context: Context = {
      name,
      entry: { ...bySuffix(servers, name.tld), ...bySuffix(overrides, name.tld) },
      registrar: options.follow === "registrar",
      connect: options.connect ?? defaultConnect,
      fetch: options.fetch ?? globalThis.fetch,
      caller: options.signal,
      signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
      timeout,
      hops: [],
    };
    const outcome = await resolve(context, options.protocol ?? "auto");
    options.signal?.throwIfAborted();
    return {
      ...toRecord(name, outcome?.found ?? NO_SERVER),
      ...(outcome && { source: outcome.source }),
      hops: context.hops,
    };
  };
}

async function resolve(
  context: Context,
  protocol: NonNullable<LookupOptions["protocol"]>,
): Promise<Outcome | undefined> {
  if (protocol === "whois") return viaWhois(context, context.signal);
  if (protocol === "rdap") return viaRdap(context, context.signal);
  const whois = await handingOff(context, (signal) => viaWhois(context, signal));
  if (whois !== undefined && whois.found.kind !== "error") return whois;
  return settle(whois, await viaRdap(context, context.signal));
}

function settle(whois: Outcome | undefined, rdap: Outcome | undefined): Outcome | undefined {
  if (whois?.found.kind !== "error" || rdap === undefined) return whois ?? rdap;
  const unrecognized = whois.found.code === "unparseable";
  if (rdap.found.kind === "record" || (!unrecognized && rdap.found.kind !== "error")) return rdap;
  return whois.found.code === "no_server" ? rdap : whois;
}

async function handingOff(
  context: Context,
  run: (signal: AbortSignal) => Promise<Outcome | undefined>,
): Promise<Outcome | undefined> {
  if (context.entry.rdap === false) return run(context.signal);
  const handOff = new AbortController();
  const timer = setTimeout(() => {
    void rdapBase(context, context.signal).then(
      (base) => {
        if (base !== undefined) handOff.abort(new DOMException("RDAP takes over from a slow WHOIS", "TimeoutError"));
      },
      () => undefined,
    );
  }, context.timeout / 2);
  try {
    return await run(AbortSignal.any([context.signal, handOff.signal]));
  } finally {
    clearTimeout(timer);
  }
}

async function rdapBase(context: Context, signal: AbortSignal): Promise<string | undefined> {
  const { rdap } = context.entry;
  if (rdap !== undefined) return rdap === false ? undefined : rdap;
  return ianaRdapBase(context.fetch, lastLabel(context.name.tld), signal);
}

async function viaRdap(context: Context, signal: AbortSignal): Promise<Outcome | undefined> {
  let base: string | undefined;
  try {
    base = await rdapBase(context, signal);
  } catch (error) {
    return { found: failure(context, error, "data.iana.org", signal), source: "rdap" };
  }
  if (base === undefined) return undefined;
  const found = await rdapHop(context, `${base.replace(/\/?$/, "/")}domain/${context.name.domain}`, signal);
  const referral = found.kind === "record" && context.registrar ? found.registrarRdap : undefined;
  if (found.kind !== "record" || referral === undefined) return { found, source: "rdap" };
  return { found: merge(found, await rdapHop(context, referral, signal)), source: "rdap" };
}

async function rdapHop(context: Context, url: string, signal: AbortSignal): Promise<Found> {
  let server = url;
  let reply: RdapReply;
  try {
    server = new URL(url).host;
    reply = await fetchRdap(context.fetch, url, signal);
  } catch (error) {
    return failure(context, error, server, signal);
  }
  context.hops.push({ protocol: "rdap", server, raw: reply.body });
  if (reply.status === 404) return { kind: "available" };
  if (reply.status === 429) {
    const { retryAfter } = reply;
    return {
      kind: "error",
      code: "rate_limited",
      message: "HTTP 429",
      server,
      ...(retryAfter !== undefined && { retryAfter }),
    };
  }
  if (reply.status !== 200) return { kind: "error", code: "network", message: `HTTP ${reply.status}`, server };
  let json: unknown;
  try {
    json = JSON.parse(reply.body);
  } catch {
    return { kind: "error", code: "unparseable", message: "RDAP reply is not JSON", server };
  }
  const found = readRdap(json);
  return found.kind === "error" ? { ...found, server } : found;
}

async function viaWhois(context: Context, signal: AbortSignal): Promise<Outcome | undefined> {
  const { name, entry } = context;
  if (entry.whois === false) return undefined;
  let host: string | undefined;
  try {
    host = entry.whois ?? (await ianaWhoisHost(context.connect, lastLabel(name.tld), signal));
  } catch (error) {
    return { found: failure(context, error, "whois.iana.org", signal), source: "whois" };
  }
  if (host === undefined) return undefined;
  const found = await whoisHop(context, host, (entry.query ?? "{domain}").replace("{domain}", name.domain), signal);
  const referral = found.kind === "record" && context.registrar ? found.registrarWhois : undefined;
  if (found.kind !== "record" || referral === undefined || referral === host) return { found, source: "whois" };
  return { found: merge(found, await whoisHop(context, referral, name.domain, signal)), source: "whois" };
}

async function whoisHop(context: Context, host: string, query: string, signal: AbortSignal): Promise<Found> {
  const ask = (): Promise<string> => queryWhois(context.connect, host, query, signal);
  let text: string;
  try {
    text = await ask().catch((error: unknown) => {
      if (signal.aborted) throw error;
      return ask();
    });
  } catch (error) {
    return failure(context, error, host, signal);
  }
  context.hops.push({ protocol: "whois", server: host, raw: text });
  if (text.trim() === "") {
    return { kind: "error", code: "rate_limited", message: "Empty reply, usually throttling", server: host };
  }
  const found = readWhois(text, context.name);
  return found.kind === "error" ? { ...found, server: host } : found;
}

function failure(context: Context, error: unknown, server: string, signal: AbortSignal): Found {
  context.caller?.throwIfAborted();
  if (signal.aborted) return { kind: "error", code: "timeout", message: `${server} didn't answer in time`, server };
  return { kind: "error", code: "network", message: error instanceof Error ? error.message : String(error), server };
}

function merge(registry: Registration, registrarHop: Found): Registration {
  if (registrarHop.kind !== "record" || !registrarHop.registrar) return registry;
  return { ...registry, registrar: { ...registrarHop.registrar, ...registry.registrar } };
}
