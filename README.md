# whoray

> WHOIS and RDAP lookups for every TLD, with one normalized result and drop-date estimates

- RDAP first, WHOIS (port 43) when the registry has no RDAP or it fails
- One result shape for both, with UTC dates, EPP status codes and redacted fields left out
- Domain lifecycle: registered, expired, redemption, pending delete, dropzone, available, reserved
- Drop-date estimates from registry and TLD schedules
- Registrar referral following, IDN support, per-server concurrency limits, timeouts
- Zero dependencies. Node.js 20.19+, Bun, Deno, Cloudflare Workers. Browsers get RDAP only.

## Install

```sh
npm install whoray
```

## Usage

```js
import { lookup } from "whoray";

const domain = await lookup("example.co");

console.log(domain.state);
//=> "registered"

console.log(domain.registrar.name);
//=> "NameCheap, Inc."

console.log(domain.dates.expires);
//=> 2027-07-19T23:59:59.000Z
```

## API

### lookup(domain, options?)

Returns a `Promise<WhorayResult>`.

Throws only for input that isn't a domain name, or when your `signal` aborts. Any other failure resolves with `state: "unknown"` and an `error`.

#### domain

Type: `string`

A domain name, in Unicode or punycode. Case and a trailing dot don't matter.

#### options

##### follow

Type: `"registry" | "registrar"`\
Default: `"registry"`

`"registrar"` also queries the registrar's own server, one extra request, to fill in registrar details.

##### rdap

Type: `"prefer" | "only" | "never"`\
Default: `"prefer"`

Use `"only"` where port 43 isn't available, such as browsers. Use `"never"` to force WHOIS.

##### timeout

Type: `number`\
Default: `10000`

Deadline in milliseconds for the whole lookup, including fallbacks and referrals.

##### signal

Type: `AbortSignal`

Cancels the lookup. The promise rejects with the signal's reason.

##### servers

Type: `Record<string, { rdap?: string; whois?: string; query?: string }>`

Overrides the servers for a TLD. `rdap` is a base URL ending in `/`; `query` is a template such as `"-T dn {domain}"`.

##### connect

Type: `(host: string, port: number, signal?: AbortSignal) => Promise<{ readable: ReadableStream; writable: WritableStream }>`

Opens the port 43 connection. Pass your own to go through a proxy. See [Recipes](#recipes).

##### fetch

Type: `typeof fetch`\
Default: `globalThis.fetch`

Used for RDAP requests.

##### concurrency

Type: `number`\
Default: `4`

Maximum requests in flight to a single server host.

### parseWhois(text, domain)

Parses a WHOIS reply you already have. Returns the same record as `lookup`, without `source` and `hops`.

### parseRdap(json, domain)

Parses an RDAP response you already have. Returns the same record as `lookup`, without `source` and `hops`.

### Result

```ts
{
  domain: "example.co",           // punycode
  unicode: "example.co",
  tld: "co",                      // longest known suffix, e.g. "co.uk"
  state: "registered",
  premium: true,                  // only on available names the registry prices as premium
  registrar: { name, ianaId, url, abuseEmail, abusePhone },
  registrant: { name, organization, country },   // only what the registry publishes
  registry: { id: "MinTIC", name: "MinTIC" },
  handle: "D249131-CNIC",         // the registry's ID for the domain
  dates: { created, updated, expires, database },
  statuses: ["clientTransferProhibited"],
  nameservers: ["dns1.registrar-servers.com"],
  dnssec: true,
  drop: { at, deletion, confidence: "high", basis: "registry schedule" },
  source: "rdap",
  hops: [{ protocol: "rdap", server: "rdap.registry.co", raw: "…" }],
  error: { code: "rate_limited", message, server, retryAfter },
}
```

Fields the registry doesn't publish are left out. `drop` appears only for expired, redemption and pending-delete domains.

#### state

| State | Meaning |
| --- | --- |
| `registered` | Registered and not expired |
| `expired` | Past its expiry date, still in the registrar's grace period |
| `redemption` | Deleted, but the owner can still restore it |
| `pendingDelete` | Can no longer be restored; drops at the end of this period |
| `dropzone` | Deleted and held by the registry before release |
| `available` | Not registered |
| `reserved` | Blocked or reserved by the registry |
| `unknown` | The lookup failed; see `error.code` |

#### error.code

`timeout`, `rate_limited`, `blocked`, `no_server`, `unparseable` or `network`.

## Recipes

### Use a SOCKS proxy for port 43

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

### Run on Cloudflare Workers

Nothing to configure. The `workerd` export condition picks a build that opens port 43 through `cloudflare:sockets`.

## CLI

```sh
npx whoray example.com example.de
npx whoray example.io --json --registrar
```

## FAQ

### How is this different from whoiser or whois?

Those speak WHOIS only and leave the result close to the raw text. whoray asks RDAP first, parses both protocols into the same record, and reports lifecycle state and drop dates.

### Why do some fields come back empty?

Most registries redact registrant details, and some publish no dates at all (`.de`, `.eu`). whoray leaves out anything the registry didn't send.

### A TLD parses wrong. What do I do?

Capture the reply with `pnpm fixture <domain>`, open an issue or a PR with it, and the fix is usually a line in `src/data/`.

## License

MIT
