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

`domain` is any domain name, in Unicode or punycode.

| Option | Default | What it does |
| --- | --- | --- |
| `follow` | `"registry"` | `"registrar"` also asks the registrar's own server, for fuller registrar details |
| `rdap` | `"prefer"` | `"only"` skips WHOIS (use in browsers); `"never"` skips RDAP |
| `timeout` | `10000` | Milliseconds for the whole lookup |
| `signal` | | `AbortSignal` to cancel the lookup |
| `servers` | | Your own servers per TLD: `{ io: { rdap: "https://…/", whois: "whois.nic.io" } }` |
| `connect` | built in | Opens the port 43 connection; pass your own to use a proxy ([example](#use-a-socks-proxy-for-port-43)) |
| `fetch` | `globalThis.fetch` | Used for RDAP requests |
| `concurrency` | `4` | Max requests at once to the same server |

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
