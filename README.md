# whoray

> WHOIS and RDAP lookups for every TLD, with one normalized result and drop-date estimates

- Asks RDAP first and falls back to WHOIS, so ccTLDs without RDAP work too
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
domain.dates.expires;   //=> 2027-07-19T23:59:59.000Z
```

## API

### lookup(domain, options?)

`domain` can be in Unicode or punycode.

| Option | Default | |
| --- | --- | --- |
| `follow` | `"registry"` | Set to `"registrar"` to also query the registrar's server for fuller registrar details |
| `rdap` | `"prefer"` | `"only"` never uses WHOIS (needed in browsers); `"never"` never uses RDAP |
| `timeout` | `10000` | Milliseconds for the whole lookup |
| `signal` | | `AbortSignal` to cancel the lookup |
| `servers` | | Your own servers for a TLD, e.g. `{ io: { whois: "whois.nic.io" } }` |
| `connect` | | Your own port 43 connection, e.g. through a [proxy](#using-a-proxy) |
| `fetch` | `globalThis.fetch` | Your own fetch for RDAP |
| `concurrency` | `4` | Max requests at once to one server |

It throws only if `domain` isn't a domain name or your `signal` aborts. Any other failure comes back as `state: "unknown"` with an `error`.

### Result

What `lookup("namecheap.co")` returns:

```js
{
  domain: "namecheap.co",
  unicode: "namecheap.co",
  tld: "co",
  state: "registered",
  registrar: {
    name: "NameCheap, Inc.",
    ianaId: 1068,
    url: "http://www.namecheap.com",
    abuseEmail: "abuse@namecheap.com",
    abusePhone: "+1.9854014545",
  },
  registrant: { country: "US" },
  registry: { id: "MinTIC", name: "MinTIC" },
  handle: "D249131-CNIC",
  dates: {
    created: 2010-07-20T17:59:53.000Z,
    updated: 2026-07-02T18:07:41.000Z,
    expires: 2027-07-19T23:59:59.000Z,
    database: 2026-10-16T21:02:58.000Z, // when the registry last refreshed this data
  },
  statuses: ["clientTransferProhibited"],
  nameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
  dnssec: true,
  source: "rdap",
  hops: [{ protocol: "rdap", server: "rdap.registry.co", raw: "{…}" }],
}
```

Anything the registry doesn't publish is left out. Three fields appear only when they apply:

- `drop`: when an expired, redemption or pending-delete domain is expected to become available, e.g. `{ at: 2026-10-23T08:08:05.000Z, confidence: "high" }`
- `premium: true`: an available name the registry sells at a premium price
- `error`: why the lookup failed, e.g. `{ code: "rate_limited", retryAfter: 30 }`

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
| `unknown` | The lookup failed; see `error.code`: `timeout`, `rate_limited`, `blocked`, `no_server`, `unparseable` or `network` |

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
```

## Issues

If a TLD comes back wrong, open an issue with the domain name.

## License

MIT
