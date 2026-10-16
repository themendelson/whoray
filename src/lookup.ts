import { ignore } from "#abort.ts";
import { servers } from "#data/servers.ts";
import type { Name } from "#domain.ts";
import { bySuffix, lastLabel, normalize } from "#domain.ts";
import { ianaRdapBase, ianaWhoisHost } from "#iana.ts";
import type { Found, Registration } from "#parse/found.ts";
import { toRecord } from "#parse/record.ts";
import { fetchRdap, readRdapReply } from "#rdap.ts";
import { referralHost, referralUrl } from "#referral.ts";
import type { Connect, Hop, LookupOptions, Protocol, ServerEntry, WhorayResult } from "#types.ts";
import { queryWhois, readWhoisReply } from "#whois.ts";

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

interface Target {
  server: string;
  ask: (signal: AbortSignal) => Promise<{ raw: string; read: () => Found }>;
}

interface Transport {
  directory: string;
  locate: (context: Context, signal: AbortSignal) => Promise<string | undefined>;
  registry: (context: Context, located: string) => Target;
  registrar: (context: Context, found: Registration, registry: Target) => Target | undefined;
}

const DEFAULT_TIMEOUT = 10_000;
const NO_SERVER: Found = { kind: "error", code: "no_server", message: "No WHOIS or RDAP server is known for this TLD" };

const transports: Record<Protocol, Transport> = {
  whois: {
    directory: "whois.iana.org",
    locate: async ({ entry, connect, name }, signal) =>
      entry.whois === false ? undefined : (entry.whois ?? ianaWhoisHost(connect, lastLabel(name.tld), signal)),
    registry: (context, host) =>
      whoisTarget(context, host, (context.entry.query ?? "{domain}").replace("{domain}", context.name.domain)),
    registrar: (context, found, registry) => {
      const host = referralHost(found.registrarWhois, registry.server);
      return host === undefined ? undefined : whoisTarget(context, host, context.name.domain);
    },
  },
  rdap: {
    directory: "data.iana.org",
    locate: rdapBase,
    registry: (context, base) => rdapTarget(context, `${base}domain/${context.name.domain}`),
    registrar: (context, found) => {
      const url = referralUrl(found.registrarRdap);
      return url === undefined ? undefined : rdapTarget(context, url);
    },
  },
};

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
  if (protocol !== "auto") return via(context, protocol, context.signal);
  const whois = await handingOff(context, (signal) => via(context, "whois", signal));
  if (whois !== undefined && whois.found.kind !== "error") return whois;
  return settle(whois, await via(context, "rdap", context.signal));
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
    void rdapBase(context, context.signal).then((base) => {
      if (base !== undefined) handOff.abort(new DOMException("RDAP takes over from a slow WHOIS", "TimeoutError"));
    }, ignore);
  }, context.timeout / 2);
  try {
    return await run(AbortSignal.any([context.signal, handOff.signal]));
  } finally {
    clearTimeout(timer);
  }
}

async function rdapBase(context: Context, signal: AbortSignal): Promise<string | undefined> {
  const { rdap } = context.entry;
  const base = rdap === undefined ? await ianaRdapBase(context.fetch, lastLabel(context.name.tld), signal) : rdap;
  return base === false ? undefined : base?.replace(/\/?$/, "/");
}

async function via(context: Context, protocol: Protocol, signal: AbortSignal): Promise<Outcome | undefined> {
  const transport = transports[protocol];
  let located: string | undefined;
  try {
    located = await transport.locate(context, signal);
  } catch (error) {
    return { found: failure(context, error, transport.directory, signal), source: protocol };
  }
  if (located === undefined) return undefined;
  const registry = transport.registry(context, located);
  const found = await hop(context, protocol, registry, signal);
  const registrar =
    found.kind === "record" && context.registrar ? transport.registrar(context, found, registry) : undefined;
  if (found.kind !== "record" || registrar === undefined) return { found, source: protocol };
  return { found: merge(found, await hop(context, protocol, registrar, signal)), source: protocol };
}

async function hop(context: Context, protocol: Protocol, target: Target, signal: AbortSignal): Promise<Found> {
  let reply: Awaited<ReturnType<Target["ask"]>>;
  try {
    reply = await target.ask(signal);
  } catch (error) {
    return failure(context, error, target.server, signal);
  }
  context.hops.push({ protocol, server: target.server, raw: reply.raw });
  const found = reply.read();
  return found.kind === "error" ? { ...found, server: target.server } : found;
}

function whoisTarget(context: Context, host: string, query: string): Target {
  const ask = (signal: AbortSignal): Promise<string> => queryWhois(context.connect, host, query, signal);
  return {
    server: host,
    ask: async (signal) => {
      const raw = await ask(signal).catch((error: unknown) => {
        if (signal.aborted) throw error;
        return ask(signal);
      });
      return { raw, read: () => readWhoisReply(raw, context.name) };
    },
  };
}

function rdapTarget(context: Context, url: string): Target {
  return {
    server: URL.canParse(url) ? new URL(url).host : url,
    ask: async (signal) => {
      const reply = await fetchRdap(context.fetch, url, signal);
      return { raw: reply.body, read: () => readRdapReply(reply) };
    },
  };
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
