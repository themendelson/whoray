import { words } from "#data/lists.ts";
import type { ServerEntry } from "#types.ts";

const identityDigital = "https://rdap.identitydigital.services/rdap/";

const nicWhois = (tlds: string): Record<string, ServerEntry> =>
  Object.fromEntries(words(tlds).map((tld) => [tld, { whois: `whois.nic.${tld}` }]));

export const servers: Record<string, ServerEntry> = {
  ...nicWhois(`
    ai art autos baby beauty beer biz blog buzz cam casa charity cloud club college courses cyou design do earth
    fans fashion film fm foundation fun garden gay gives gl help homes host icu ink it la lat lol london makeup
    men miami moe mom nyc one online party photo press pw quest rent review sbs shop site sl space store stream
    study sydney tattoo tech tel top trade tube tv vegas vip website wiki win xyz
  `),
  ac: { rdap: identityDigital, whois: "whois.nic.ac" },
  ag: { rdap: identityDigital },
  au: { whois: "whois.auda.org.au" },
  bz: { rdap: identityDigital, whois: "whois.identity.digital" },
  ca: { whois: "whois.cira.ca" },
  cc: { whois: "ccwhois.verisign-grs.com" },
  ch: { rdap: "https://rdap.nic.ch/" },
  co: { rdap: "https://rdap.registry.co/co/", whois: "whois.registry.co" },
  "co.il": { whois: "whois.isoc.org.il" },
  de: { rdap: "https://rdap.denic.de/", whois: "whois.denic.de", query: "-T dn,ace {domain}" },
  id: { whois: "whois.id" },
  io: { rdap: identityDigital, whois: "whois.nic.io" },
  jp: { whois: "whois.jprs.jp", query: "{domain}/e" },
  lc: { rdap: identityDigital },
  li: { rdap: "https://rdap.nic.ch/" },
  link: { whois: "whois.uniregistry.net" },
  me: { rdap: identityDigital, whois: "whois.nic.me" },
  mn: { rdap: identityDigital },
  // Verisign's .name WHOIS is thin: it publishes no creation, expiry or update date.
  name: { whois: "whois.nic.name", prefer: "rdap" },
  pr: { rdap: identityDigital },
  ro: { whois: "whois.rotld.ro" },
  rs: { whois: "whois.rnids.rs" },
  sc: { rdap: identityDigital },
  sh: { rdap: identityDigital, whois: "whois.nic.sh" },
  sn: { rdap: "https://rdap.nic.sn/" },
  so: { rdap: "https://rdap.nic.so/", whois: "whois.nic.so" },
  // whois.sx's address: ns4.ns.sx answers NXDOMAIN for whois.sx, so resolvers that cache it can't connect.
  sx: { whois: "192.228.25.103" },
  us: { rdap: "https://rdap.nic.us/", whois: "whois.nic.us" },
  vc: { whois: "whois.identitydigital.services" },
  ws: { rdap: "https://rdap.website.ws/", whois: "whois.website.ws" },
};
