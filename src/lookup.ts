import { ignore } from "#abort.ts";
import type { Context, Outcome } from "#query.ts";
import { query, via } from "#query.ts";
import { rdapBase, rdapTransport, whoisTransport } from "#transports.ts";
import type { Connect, LookupOptions, RdapOptions, WhoisOptions, WhorayResult } from "#types.ts";

export type Lookup<Options = LookupOptions> = (domain: string, options?: Options) => Promise<WhorayResult>;

export function lookupVia(defaultConnect: Connect, domain: string, options: LookupOptions = {}): Promise<WhorayResult> {
  const fetcher = options.fetch ?? globalThis.fetch;
  const whois = whoisTransport(options.connect ?? defaultConnect);
  const rdap = rdapTransport(fetcher);
  return query(domain, options, async (context) => {
    const asked = await handingOff(context, fetcher, (signal) => via(context, whois, signal));
    if (asked !== undefined && asked.found.kind !== "error") return asked;
    return settle(asked, await via(context, rdap, context.signal));
  });
}

export function whoisVia(defaultConnect: Connect, domain: string, options: WhoisOptions = {}): Promise<WhorayResult> {
  const whois = whoisTransport(options.connect ?? defaultConnect);
  return query(domain, options, (context) => via(context, whois, context.signal));
}

export function rdap(domain: string, options: RdapOptions = {}): Promise<WhorayResult> {
  const transport = rdapTransport(options.fetch ?? globalThis.fetch);
  return query(domain, options, (context) => via(context, transport, context.signal));
}

function settle(whois: Outcome | undefined, rdap: Outcome | undefined): Outcome | undefined {
  if (whois?.found.kind !== "error" || rdap === undefined) return whois ?? rdap;
  const unrecognized = whois.found.code === "unparseable";
  if (rdap.found.kind === "record" || (!unrecognized && rdap.found.kind !== "error")) return rdap;
  return whois.found.code === "no_server" ? rdap : whois;
}

async function handingOff(
  context: Context,
  fetcher: typeof fetch,
  run: (signal: AbortSignal) => Promise<Outcome | undefined>,
): Promise<Outcome | undefined> {
  if (context.entry.rdap === false) return run(context.signal);
  const handOff = new AbortController();
  const timer = setTimeout(() => {
    void rdapBase(fetcher, context, context.signal).then((base) => {
      if (base !== undefined) handOff.abort(new DOMException("RDAP takes over from a slow WHOIS", "TimeoutError"));
    }, ignore);
  }, context.timeout / 2);
  try {
    return await run(AbortSignal.any([context.signal, handOff.signal]));
  } finally {
    clearTimeout(timer);
  }
}
