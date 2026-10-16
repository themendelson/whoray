import { lastLabel } from "#domain.ts";
import { ianaRdapBase, ianaWhoisHost } from "#iana.ts";
import type { Context, Target, Transport } from "#query.ts";
import { fetchRdap, readRdapReply } from "#rdap.ts";
import { referralHost, referralUrl } from "#referral.ts";
import type { Connect } from "#types.ts";
import { queryWhois, readWhoisReply } from "#whois.ts";

export function whoisTransport(connect: Connect): Transport {
  const target = (context: Context, host: string, query: string): Target => {
    const ask = (signal: AbortSignal): Promise<string> => queryWhois(connect, host, query, signal);
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
  };
  return {
    protocol: "whois",
    directory: "whois.iana.org",
    locate: async ({ entry, name }, signal) =>
      entry.whois === false ? undefined : (entry.whois ?? ianaWhoisHost(connect, lastLabel(name.tld), signal)),
    registry: (context, host) =>
      target(context, host, (context.entry.query ?? "{domain}").replace("{domain}", context.name.domain)),
    registrar: (context, found, registry) => {
      const host = referralHost(found.registrarWhois, registry.server);
      return host === undefined ? undefined : target(context, host, context.name.domain);
    },
  };
}

export function rdapTransport(fetcher: typeof fetch): Transport {
  const target = (url: string): Target => ({
    server: URL.canParse(url) ? new URL(url).host : url,
    ask: async (signal) => {
      const reply = await fetchRdap(fetcher, url, signal);
      return { raw: reply.body, read: () => readRdapReply(reply) };
    },
  });
  return {
    protocol: "rdap",
    directory: "data.iana.org",
    locate: (context, signal) => rdapBase(fetcher, context, signal),
    registry: (context, base) => target(`${base}domain/${context.name.domain}`),
    registrar: (_context, found) => {
      const url = referralUrl(found.registrarRdap);
      return url === undefined ? undefined : target(url);
    },
  };
}

export async function rdapBase(
  fetcher: typeof fetch,
  context: Context,
  signal: AbortSignal,
): Promise<string | undefined> {
  const { rdap } = context.entry;
  const base = rdap === undefined ? await ianaRdapBase(fetcher, lastLabel(context.name.tld), signal) : rdap;
  return base === false ? undefined : base?.replace(/\/?$/, "/");
}
