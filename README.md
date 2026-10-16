# whoray

WHOIS and RDAP for every TLD. One call, one normalized result, lifecycle and drop dates. Zero dependencies.

```bash
npm i whoray
```

```ts
import { lookup } from "whoray";

const domain = await lookup("example.co");

domain.state;       // "registered" | "expired" | "redemption" | "pendingDelete" | "available" | "reserved" | "unknown"
domain.registrar;   // { name: "NameCheap, Inc.", ianaId: 1068, url, abuseEmail }
domain.dates;       // { created, updated, expires } as UTC Dates
domain.statuses;    // ["clientTransferProhibited"]
domain.nameservers; // ["dns1.registrar-servers.com", "dns2.registrar-servers.com"]
domain.drop;        // { at: Date, confidence: "high" | "low", basis } for expiring domains
domain.hops;        // every raw RDAP/WHOIS response, in order
```

## Why

- **RDAP first, port 43 when it has to.** gTLDs answer RDAP. About 70% of ccTLDs still don't, so whoray falls back to WHOIS and parses it.
- **Servers that work.** A small curated list of servers IANA doesn't know about, then IANA at runtime, cached in memory.
- **One shape.** RDAP JSON and 40+ WHOIS dialects come out as the same record. Dates are UTC `Date`s, statuses are EPP codes, and redacted fields are `undefined`.
- **Lifecycle.** Expired, redemption and pending-delete domains get a drop-date estimate from registry and TLD schedules.
- **Runs everywhere.** Node 20.19+, Bun, Deno, Cloudflare Workers (port 43 via `cloudflare:sockets`). In browsers it does RDAP only.

## Options

```ts
await lookup("example.com", {
  follow: "registrar",  // also ask the registrar's server; default "registry"
  rdap: "only",         // "prefer" (default) | "only" | "never"
  timeout: 10_000,      // total deadline in ms
  signal,               // AbortSignal
  servers: { co: { rdap: "https://rdap.registry.co/co/" } },
  connect,              // (host, port) => { readable, writable } for port 43: proxies, SOCKS, custom egress
  fetch,                // RDAP fetch
  concurrency: 4,       // in-flight requests per server host
});
```

`lookup` throws only on invalid input or when your `signal` aborts. Everything else comes back with `state: "unknown"` and `error.code`: `timeout`, `rate_limited` (with `retryAfter` when the server sends one), `blocked`, `no_server`, `unparseable` or `network`.

Already have a response? `parseWhois(text, domain)` and `parseRdap(json, domain)` return the same record.

### Through a SOCKS proxy

```ts
import { Duplex } from "node:stream";
import { SocksClient } from "socks";

const connect = async (host: string, port: number) => {
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

```bash
npx whoray example.com example.de --registrar
npx whoray example.io --json
```

## Contributing

A TLD that parses badly is almost always a data fix in `src/data/`. Capture the real response, then run the tests:

```bash
pnpm fixture nic.example
pnpm test -u   # writes the expected record next to the capture; read it before committing
pnpm check
```

## License

MIT
