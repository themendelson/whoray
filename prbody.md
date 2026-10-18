## What changed

`src/data/drop-rules.ts`: a `hk` rule. A name drops 90 days after its expiry date.

## Why

`.hk` had no rule or registry entry, so it fell back to the default periods (45 + 30 + 5 = 80 days from expiry). 4 observed `.hk` drops all land exactly 90 days after expiry:

| | Expires | Observed | Was |
|---|---|---|---|
| aura.hk | 08-19 | **11-17** | 11-07 |
| job.hk | 08-10 | **11-08** | 10-29 |
| project.hk | 07-28 | **10-26** | 10-16 |
| goat.hk | 07-28 | **10-26** | 10-16 |

## Reviewer notes

- New fixture: `aura.hk`. No other expected file changed.

## Commands

- `pnpm fixture aura.hk`: captured
- `pnpm test -u`: wrote the new expected record, no other expected file changed
- `pnpm check`: lint, typecheck, tests pass

🤖 Generated with [Claude Code](https://claude.com/claude-code)
