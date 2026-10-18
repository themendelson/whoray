<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/wordmark-dark.svg">
    <img src="assets/wordmark-light.svg" alt="whoray" width="360">
  </picture>
</h1>

> WHOIS and RDAP lookups for every TLD, with one normalized result and drop-date estimates

- Asks WHOIS first and falls back to RDAP, so reserved, premium and dropzone names aren't reported as available
- Same result shape for every registry: UTC dates, EPP status codes, redacted fields left out
- Knows where a domain is in its lifecycle, and estimates when an expiring domain drops
- Zero dependencies. Runs on Node.js 20.19+, Bun, Deno and Cloudflare Workers. Browsers get RDAP only.

## Install

```sh
npm install whoray
```

## Usage

```js
import { lookup } from "whoray";

const domain = await lookup("namecheap.co");

domain.state;           //=> "registered"
domain.registrar?.name; //=> "NameCheap, Inc."
domain.expirationDate;  //=> 2027-07-19T23:59:59.000Z
```

## API

### lookup(domain, options?)

`domain` can be in Unicode or punycode.

| Option | Default | |
| --- | --- | --- |
| `follow` | `"registry"` | Set to `"registrar"` to also query the registrar's server for fuller registrar details |
| `protocol` | `"auto"` | `"auto"` asks WHOIS and moves to RDAP when WHOIS has no server, fails or is slow; `"whois"` or `"rdap"` asks only that one. In a browser it defaults to `"rdap"` unless you pass `connect` |
| `timeout` | `10000` | Milliseconds for the whole lookup |
| `signal` | | `AbortSignal` to cancel the lookup |
| `servers` | | Your own servers for a TLD, e.g. `{ io: { whois: "whois.nic.io" } }`; `whois: false` or `rdap: false` skips that protocol for it |
| `connect` | | Your own port 43 connection, e.g. through a [proxy](#using-a-proxy) |
| `fetch` | `globalThis.fetch` | Your own fetch for RDAP |

It throws only if `domain` isn't a domain name or your `signal` aborts. Any other failure comes back as `state: "unknown"` with an `error`.

### Result

Fields marked `?` are left out when they don't apply or the registry doesn't publish them.

```ts
{
  domain: string;              // "namecheap.co", always punycode
  unicode?: string;            // "bücher.de", only for internationalized names
  tld: string;                 // "co", or "co.uk" for second-level suffixes
  state: State;                // see the table below
  isAvailable?: boolean;       // true only when the name can be registered now; missing only when the lookup failed
  premium?: true;              // an available name the registry sells at a premium price

  registrar?: { name: string; ianaId?: number; url?: string; abuseEmail?: string; abusePhone?: string; whoisServer?: string };
  registrant?: {
    name?: string; organization?: string;
    street?: string[]; city?: string; state?: string; postalCode?: string;
    country?: string;          // ISO 3166 code
    email?: string; phone?: string;
  };                           // only what the registry publishes; redacted values are left out
  registry?: { id: string; name: string };  // the TLD's operator: { id: "mintic", name: "MinTIC" }
  handle?: string;             // the registry's ID for the domain: "D249131-CNIC"

  creationDate?: Date;
  updatedDate?: Date;
  expirationDate?: Date;
  deletionDate?: Date;         // registries that hold deleted names 12 hours before release
  dropDate?: Date;             // when an expiring domain becomes available
  snapshotDate?: Date;         // when the registry took the copy of the data you received

  statuses: string[];          // EPP codes: ["clientTransferProhibited"]
  nameservers: string[];       // ["dns1.registrar-servers.com", "dns2.registrar-servers.com"]
  dnssec?: boolean;

  source?: "whois" | "rdap";   // which protocol answered; left out when no server was found
  hops: { protocol: "rdap" | "whois"; server: string; raw: string }[];  // every raw reply, in order
  error?: { code: string; message: string; server?: string; retryAfter?: number };
}
```

#### state

| | |
| --- | --- |
| `registered` | Registered and not expired |
| `expired` | Past its expiry date, in the registrar's grace period |
| `redemption` | Deleted, but the owner can still restore it |
| `pendingDelete` | Can't be restored anymore; drops soon |
| `dropzone` | Deleted and held by the registry before release |
| `available` | Not registered |
| `reserved` | Reserved or blocked by the registry |
| `unknown` | The lookup failed. `error.code` is one of `timeout`, `rate_limited`, `blocked`, `no_server`, `unparseable` or `network` |

## Using a proxy

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

## CLI

```sh
npx whoray namecheap.co
npx whoray namecheap.co --json
npx whoray namecheap.co --protocol rdap --registrar --raw
```

It exits with 1 if any lookup failed. `npx whoray --help` lists the options.

## Issues

If a TLD comes back wrong, open an issue with the domain name.

## License

MIT
