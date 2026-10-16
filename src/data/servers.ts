import type { ServerEntry } from "#types.ts";

const identityDigital = "https://rdap.identitydigital.services/rdap/";

export const servers: Record<string, ServerEntry> = {
  ac: { rdap: identityDigital },
  bz: { whois: "whois.identity.digital" },
  ch: { rdap: "https://rdap.nic.ch/" },
  co: { rdap: "https://rdap.registry.co/co/" },
  de: { rdap: "https://rdap.denic.de/", whois: "whois.denic.de", query: "-T dn {domain}" },
  io: { rdap: identityDigital },
  jp: { whois: "whois.jprs.jp", query: "{domain}/e" },
  li: { rdap: "https://rdap.nic.ch/" },
  me: { rdap: identityDigital },
  sh: { rdap: identityDigital },
  so: { rdap: "https://rdap.nic.so/" },
  us: { rdap: "https://rdap.nic.us/" },
  ws: { rdap: "https://rdap.website.ws/" },
};
