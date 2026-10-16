import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { rdap, whois } from "#node.ts";
import type { Capture } from "./support.ts";
import { captures, httpServer, whoisServer } from "./support.ts";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

function replay(capture: Capture): ReturnType<typeof rdap> {
  if (capture.protocol === "rdap") {
    const { fetch } = httpServer(() => ({ status: Number(capture.header), body: capture.body }));
    return rdap(capture.domain, { fetch, servers: { [capture.tld]: { rdap: "https://rdap.test/" } } });
  }
  const { connect } = whoisServer(() => capture.body);
  return whois(capture.domain, { connect, servers: { [capture.tld]: { whois: "whois.test" } } });
}

test.each(captures())("$path parses to its expected record", async (capture) => {
  const { hops, ...record } = await replay(capture);
  expect(hops.map((hop) => hop.raw)).toEqual([capture.body]);
  await expect(`${JSON.stringify(record, null, 2)}\n`).toMatchFileSnapshot(
    `${capture.path.replace(/^test\//, "")}.json`,
  );
});

const whoisWithoutNameservers = new Set(["name", "no"]);

test("WHOIS and RDAP agree on state, dates and nameservers for the same registered domain", async () => {
  const all = captures();
  const pairs = all.flatMap((rdap) => {
    const whois = all.find((other) => other.protocol === "whois" && other.domain === rdap.domain);
    return rdap.protocol === "rdap" && rdap.header === "200" && whois ? [{ rdap, whois }] : [];
  });
  const disagreements: string[] = [];
  for (const pair of pairs) {
    const [fromRdap, fromWhois] = await Promise.all([replay(pair.rdap), replay(pair.whois)]);
    if (fromRdap.state === "unknown" || fromWhois.state === "unknown") continue;
    for (const field of ["creationDate", "expirationDate"] as const) {
      const a = fromRdap[field]?.getTime();
      const b = fromWhois[field]?.getTime();
      if (a !== undefined && b !== undefined && Math.abs(a - b) > 86_400_000) {
        disagreements.push(`${pair.rdap.domain} ${field}`);
      }
    }
    const nameservers = [fromRdap.nameservers, fromWhois.nameservers].map((list) => [...list].sort().join(","));
    if (nameservers[0] !== nameservers[1] && !whoisWithoutNameservers.has(pair.rdap.tld))
      disagreements.push(`${pair.rdap.domain} nameservers`);
    if (fromRdap.state !== fromWhois.state) disagreements.push(`${pair.rdap.domain} state`);
  }
  expect(pairs.length).toBeGreaterThan(50);
  expect(disagreements).toEqual([]);
});
