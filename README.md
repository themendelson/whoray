<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/wordmark-dark.svg">
    <img src="assets/wordmark-light.svg" alt="whoray" width="360">
  </picture>
</h1>

<p align="center">WHOIS and RDAP lookups for any domain, with expiry and drop dates</p>

<p align="center">
  <a href="https://www.npmjs.com/package/whoray"><img src="https://img.shields.io/npm/v/whoray" alt="npm"></a>
  <a href="https://github.com/themendelson/whoray/actions/workflows/ci.yml"><img src="https://github.com/themendelson/whoray/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

- One normalized result across 1,000+ gTLDs and ccTLDs
- Up-to-date servers, including 100+ TLDs where IANA's are wrong or missing
- Smart WHOIS/RDAP routing with fallback
- Drop date estimates for expiring domains
- Zero dependencies
- Runs on Node.js 20.19+, Bun, Deno, Cloudflare Workers and browsers

## Install

```sh
npm install whoray
```

## Usage

```js
import { lookup } from "whoray";

await lookup("sisley.pr");
```

```js
{
  domain: "sisley.pr",
  tld: "pr",
  state: "redemption",
  isAvailable: false,
  registrar: {
    name: "CSC Corporate Domains, Inc.",
    ianaId: 299,
    url: "http://www.cscglobal.com",
    abuseEmail: "domainabuse@cscglobal.com",
    abusePhone: "+1.3026365400",
    whoisServer: "www.whois.corporatedomains.com"
  },
  registrant: {
    name: "Domain Administrator",
    organization: "Sisley Paris",
    street: ["16 avenue George V"],
    city: "PARIS",
    postalCode: "75008",
    country: "FR",
    email: "domains.managers@sisley.fr",
    phone: "+33.149523500"
  },
  admin: {
    name: "Domain Administrator",
    organization: "Sisley Paris",
    street: ["16 avenue George V"],
    city: "PARIS",
    postalCode: "75008",
    country: "FR",
    email: "domains.managers@sisley.fr",
    phone: "+33.149523500"
  },
  tech: {
    name: "INDOM contact",
    organization: "INDOM",
    street: ["124-126 rue de Provence"],
    city: "Paris",
    state: "Paris",
    postalCode: "75008",
    country: "FR",
    email: "indom@indom.com",
    phone: "+33.148018360",
    fax: "+33.148016773"
  },
  registry: { id: "identity-digital", name: "Identity Digital" },
  handle: "e002c36bd1004de3a43a9ba3b899a435-DONUTS",
  creationDate: 2012-10-22T06:01:54.000Z,
  updatedDate: 2026-10-11T05:15:41.000Z,
  expirationDate: 2026-10-22T00:00:00.000Z,
  snapshotDate: 2026-10-18T23:27:18.000Z,
  dropDate: 2026-11-15T17:15:41.000Z, // set while expired, in redemption or pendingDelete
  deletionDate: 2026-11-15T05:15:41.000Z,
  statuses: ["clientTransferProhibited", "redemptionPeriod"],
  nameservers: ["indom10.indomco.com", "indom20.indomco.net"],
  dnssec: false,
  source: "whois",
  hops: [{ protocol: "whois", server: "whois.afilias-srs.net", raw: "Domain Name: sisley.pr\r\n…" }]
}
```

## CLI

```sh
npx whoray sisley.pr
```

```
sisley.pr  redemption
  registrar    CSC Corporate Domains, Inc.
  created      2012-10-22
  expires      2026-10-22
  statuses     clientTransferProhibited, redemptionPeriod
  nameservers  indom10.indomco.com, indom20.indomco.net
  source       whois via whois.afilias-srs.net
  drops        2026-11-15T17:15:41.000Z
```

```sh
npx whoray namecheap.co bücher.de                 # several at once
npx whoray namecheap.co --json                    # the full result
npx whoray namecheap.co --protocol rdap           # auto, whois or rdap
npx whoray namecheap.co --registrar --raw         # follow the registrar, print every raw reply
```

It exits with 1 if any lookup failed. `npx whoray --help` lists the options.

## API

### lookup(domain, options?)

`domain` can be in Unicode or punycode.

| Option | Default | |
| --- | --- | --- |
| `protocol` | `"auto"` | `"auto"` asks WHOIS and moves to RDAP when WHOIS has no server, fails or is slow; `"whois"` or `"rdap"` asks only that one. In a browser it defaults to `"rdap"` unless you pass `connect` |
| `follow` | `"registry"` | Set to `"registrar"` to also query the registrar's server for fuller registrar details |
| `timeout` | `10000` | Milliseconds for the whole lookup |
| `signal` | | `AbortSignal` to cancel the lookup |
| `servers` | | Your own servers for a TLD, e.g. `{ io: { whois: "whois.nic.io" } }`; `whois: false` or `rdap: false` skips that protocol for it; `prefer: "rdap"` makes `auto` ask RDAP first |
| `connect` | | Your own port 43 connection, e.g. through a [proxy](#using-a-proxy) |
| `fetch` | `globalThis.fetch` | Your own fetch for RDAP |

It throws only if `domain` isn't a domain name or your `signal` aborts. Any other failure comes back as
`state: "unknown"` with an [`error`](#errors).

### Result

Dates are UTC `Date`s. A field that doesn't apply, or that the registry redacts or doesn't publish, is left out
rather than set to `""`.

```ts
interface WhorayResult {
  domain: string;            // always punycode: "xn--bcher-kva.de"
  unicode?: string;          // only for internationalized names: "bücher.de"
  tld: string;               // "co", or "co.uk" for second-level suffixes
  state: DomainState;        // see below
  isAvailable?: boolean;     // true only when the name can be registered now; left out when the lookup failed
  premium?: true;            // an available name the registry sells at a premium price

  registrar?: Registrar;
  registrant?: Contact;
  admin?: Contact;
  tech?: Contact;
  billing?: Contact;
  registry?: { id: string; name: string };  // the TLD's operator
  handle?: string;           // the registry's ID for the domain

  creationDate?: Date;
  updatedDate?: Date;
  expirationDate?: Date;
  deletionDate?: Date;       // for registries that hold deleted names 12 hours before release
  dropDate?: Date;           // estimated from the registry's deletion schedule
  snapshotDate?: Date;       // when the registry took the copy of the data you received

  statuses: string[];        // EPP status codes
  nameservers: string[];     // lowercase hostnames
  dnssec?: boolean;

  source?: "whois" | "rdap"; // which protocol answered; left out when no server was found
  hops: Hop[];               // every server asked, in order
  error?: WhorayError;       // set when state is "unknown"
}

interface Registrar extends Address {
  name: string;
  ianaId?: number;
  url?: string;
  abuseEmail?: string;
  abusePhone?: string;
  whoisServer?: string;
}

interface Contact extends Address {
  name?: string;
  organization?: string;
}

interface Address {
  street?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;          // ISO 3166 code
  email?: string;
  phone?: string;
  fax?: string;
}

interface Hop {
  protocol: "whois" | "rdap";
  server: string;
  raw: string;               // the reply as received
}

interface WhorayError {
  code: ErrorCode;           // see below
  message: string;
  server?: string;
  retryAfter?: number;       // seconds, when the server said when to retry
}
```

#### DomainState

| | |
| --- | --- |
| `registered` | Registered and not expired |
| `expired` | Past its expiry date, in the registrar's grace period |
| `redemption` | Deleted, but the owner can still restore it |
| `pendingDelete` | Can't be restored anymore; drops soon |
| `dropzone` | Deleted and held by the registry before release |
| `available` | Not registered |
| `reserved` | Reserved or blocked by the registry |
| `unknown` | The lookup failed; see `error` |

#### Errors

| `error.code` | |
| --- | --- |
| `timeout` | No answer within `timeout` |
| `rate_limited` | The server is throttling you; `retryAfter` says for how long when it's known |
| `blocked` | The server refused this client |
| `no_server` | No WHOIS or RDAP server is known for the TLD |
| `unparseable` | The server answered with something that isn't a domain record |
| `network` | The connection failed or the RDAP server answered with an HTTP error |

## Using a proxy

Pass `connect` to open port 43 connections yourself, for example through SOCKS:

```js
import { Duplex } from "node:stream";
import { SocksClient } from "socks";
import { lookup } from "whoray";

const connect = async (host, port) => {
  const { socket } = await SocksClient.createConnection({
    proxy: { host: "127.0.0.1", port: 1080, type: 5 },
    command: "connect",
    destination: { host, port },
  });
  return Duplex.toWeb(socket);
};

await lookup("example.de", { connect });
```

## Issues

If a TLD comes back wrong, open an issue with the domain name.

## License

MIT
