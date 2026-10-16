# whoray

WHOIS and RDAP for every TLD: one `lookup()`, one normalized result, zero runtime dependencies.
Runs on Node 20.19+, Bun, Deno and Cloudflare Workers; browsers get RDAP only.

## Commands

```bash
pnpm install
pnpm check                  # lint + typecheck + tests: the gate before "done"
pnpm test test/lookup.test.ts
pnpm fixture nic.de         # capture live RDAP and WHOIS responses into test/fixtures
pnpm suffixes               # regenerate src/data/suffixes.ts from the Public Suffix List
pnpm test -u                # write expected records for new captures
pnpm build
```

## Layout

- `src/node.ts`, `src/workerd.ts`, `src/browser.ts`: entry points, picked by package.json export
  conditions. Each only wires a socket into `createLookup`; the shared exports live in `src/core.ts`.
- `src/lookup.ts`: one path for both protocols (locate the server, ask the registry, follow the
  registrar). `protocol: "auto"` asks WHOIS and falls back to RDAP.
- `src/whois.ts`, `src/rdap.ts`: the transports. `src/iana.ts`: IANA lookups, cached for a day.
- `src/domain.ts`: input normalization and the public suffix rules.
- `src/parse/`: WHOIS text and RDAP JSON into a `DomainRecord`.
- `src/data/`: servers, registries, label aliases, phrases, statuses,
  public suffixes, per-TLD quirks. Knowledge about a TLD
  lives here, never in an `if (tld === …)` in code.

## Rules the linter can't check

- No runtime dependencies, and nothing that only exists on one runtime outside `src/socket/`.
- A new TLD, label or phrase is a data change. If the parser needs code for one TLD, add a named
  transform to `src/parse/transforms.ts` and reference it from `src/data/quirks.ts`.
- Parse, don't cast: JSON from servers is read through `#json.ts`. Casts are a lint error; fix the
  type at its source instead of working around it.
- Dates are UTC `Date`s. Never build one from local-time parts or `new Date(someString)`.
- A missing or redacted value is `undefined`, never `""` or a placeholder.
- Tests go through the public API (`lookup` with fake `connect`/`fetch` from `test/support.ts`,
  `parseWhois`, `parseRdap`). Registry formats are tested against captured responses
  (`pnpm fixture`), never hand-written ones. A rule test may use a few inline lines when its
  name states the rule. Read the raw response before accepting a changed expected file
  (`pnpm test -u`). No test touches the network.
- Don't write comments. Name things so the code explains itself. The only exception is a why a
  reader can't get from the code: two lines at most, never narrating or restating. CI enforces the
  two-line limit and rejects commented-out code.

## Done means

`pnpm check` passes, the diff touches only what the task needs, and the summary lists the commands
you ran with their results.
