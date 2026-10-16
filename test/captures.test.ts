import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { lookup } from "#node.ts";
import type { Capture } from "./support.ts";
import { captures, httpServer, whoisServer } from "./support.ts";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

function replay(capture: Capture): ReturnType<typeof lookup> {
  if (capture.protocol === "rdap") {
    const { fetch } = httpServer(() => ({ status: Number(capture.header), body: capture.body }));
    return lookup(capture.domain, { rdap: "only", fetch, servers: { [capture.tld]: { rdap: "https://rdap.test/" } } });
  }
  const { connect } = whoisServer(() => capture.body);
  return lookup(capture.domain, { connect, servers: { [capture.tld]: { rdap: false, whois: "whois.test" } } });
}

test.each(captures())("$path parses to its expected record", async (capture) => {
  const { hops, ...record } = await replay(capture);
  expect(hops.map((hop) => hop.raw)).toEqual([capture.body]);
  await expect(`${JSON.stringify(record, null, 2)}\n`).toMatchFileSnapshot(
    `${capture.path.replace(/^test\//, "")}.json`,
  );
});

test("WHOIS and RDAP agree on dates and nameservers for the same registered domain", async () => {
  const all = captures();
  const pairs = all.flatMap((rdap) => {
    const whois = all.find((other) => other.protocol === "whois" && other.domain === rdap.domain);
    return rdap.protocol === "rdap" && rdap.header === "200" && whois ? [{ rdap, whois }] : [];
  });
  const disagreements: string[] = [];
  for (const pair of pairs) {
    const [fromRdap, fromWhois] = await Promise.all([replay(pair.rdap), replay(pair.whois)]);
    for (const field of ["creationDate", "expirationDate"] as const) {
      const a = fromRdap[field]?.getTime();
      const b = fromWhois[field]?.getTime();
      if (a !== undefined && b !== undefined && Math.abs(a - b) > 86_400_000) {
        disagreements.push(`${pair.rdap.domain} ${field}`);
      }
    }
    const nameservers = [fromRdap.nameservers, fromWhois.nameservers].map((list) => [...list].sort().join(","));
    if (fromRdap.nameservers.length > 0 && fromWhois.nameservers.length > 0 && nameservers[0] !== nameservers[1]) {
      disagreements.push(`${pair.rdap.domain} nameservers`);
    }
  }
  expect(pairs.length).toBeGreaterThan(50);
  expect(disagreements).toEqual([]);
});
