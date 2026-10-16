import { servers } from "#data/servers.ts";
import type { Name } from "#domain.ts";
import { bySuffix, normalize } from "#domain.ts";
import { isKnownSuffix } from "#lifecycle.ts";
import type { Found, Registration } from "#parse/found.ts";
import { toRecord } from "#parse/record.ts";
import type { Hop, Protocol, QueryOptions, ServerEntry, WhorayResult } from "#types.ts";

export interface Context {
  name: Name;
  entry: ServerEntry;
  registrar: boolean;
  caller: AbortSignal | undefined;
  signal: AbortSignal;
  timeout: number;
  hops: Hop[];
}

export interface Outcome {
  found: Found;
  source: Protocol;
}

export interface Target {
  server: string;
  ask: (signal: AbortSignal) => Promise<{ raw: string; read: () => Found }>;
}

export interface Transport {
  protocol: Protocol;
  directory: string;
  locate: (context: Context, signal: AbortSignal) => Promise<string | undefined>;
  registry: (context: Context, located: string) => Target;
  registrar: (context: Context, found: Registration, registry: Target) => Target | undefined;
}

const DEFAULT_TIMEOUT = 10_000;
const NO_SERVER: Found = { kind: "error", code: "no_server", message: "No WHOIS or RDAP server is known for this TLD" };

export async function query(
  domain: string,
  options: QueryOptions,
  resolve: (context: Context) => Promise<Outcome | undefined>,
): Promise<WhorayResult> {
  options.signal?.throwIfAborted();
  const overrides = options.servers ?? {};
  const name = normalize(domain, (suffix) => isKnownSuffix(suffix) || Object.hasOwn(overrides, suffix));
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const deadline = AbortSignal.timeout(timeout);
  const context: Context = {
    name,
    entry: { ...bySuffix(servers, name.tld), ...bySuffix(overrides, name.tld) },
    registrar: options.follow === "registrar",
    caller: options.signal,
    signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
    timeout,
    hops: [],
  };
  const outcome = await resolve(context);
  options.signal?.throwIfAborted();
  return {
    ...toRecord(name, outcome?.found ?? NO_SERVER),
    ...(outcome && { source: outcome.source }),
    hops: context.hops,
  };
}

export async function via(context: Context, transport: Transport, signal: AbortSignal): Promise<Outcome | undefined> {
  const source = transport.protocol;
  let located: string | undefined;
  try {
    located = await transport.locate(context, signal);
  } catch (error) {
    return { found: failure(context, error, transport.directory, signal), source };
  }
  if (located === undefined) return undefined;
  const registry = transport.registry(context, located);
  const found = await hop(context, source, registry, signal);
  const registrar =
    found.kind === "record" && context.registrar ? transport.registrar(context, found, registry) : undefined;
  if (found.kind !== "record" || registrar === undefined) return { found, source };
  return { found: merge(found, await hop(context, source, registrar, signal)), source };
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

function failure(context: Context, error: unknown, server: string, signal: AbortSignal): Found {
  context.caller?.throwIfAborted();
  if (signal.aborted) return { kind: "error", code: "timeout", message: `${server} didn't answer in time`, server };
  return { kind: "error", code: "network", message: error instanceof Error ? error.message : String(error), server };
}

function merge(registry: Registration, registrarHop: Found): Registration {
  if (registrarHop.kind !== "record" || !registrarHop.registrar) return registry;
  return { ...registry, registrar: { ...registrarHop.registrar, ...registry.registrar } };
}
