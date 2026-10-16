import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { parseRdap, parseWhois } from "#node.ts";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

function rdap(domain: string, status: string[], events: Record<string, string>): unknown {
  return {
    objectClassName: "domain",
    ldhName: domain,
    status,
    events: Object.entries(events).map(([eventAction, eventDate]) => ({ eventAction, eventDate })),
  };
}

test("a pendingDelete .com drops five days after its last update", () => {
  const record = parseRdap(
    rdap("example.com", ["pending delete"], {
      "last changed": "2026-10-14T18:00:00Z",
      expiration: "2026-08-01T00:00:00Z",
    }),
    "example.com",
  );
  expect(record.state).toBe("pendingDelete");
  expect(record.drop).toEqual({ at: new Date("2026-10-19T18:00:00Z"), confidence: "high", basis: "registry schedule" });
});

test("a domain in redemption drops after redemption plus pending delete", () => {
  const record = parseRdap(
    rdap("example.com", ["redemption period", "pending delete"], {
      "last changed": "2026-10-01T00:00:00Z",
      expiration: "2026-08-20T00:00:00Z",
    }),
    "example.com",
  );
  expect(record.state).toBe("redemption");
  expect(record.drop?.at).toEqual(new Date("2026-11-10T00:00:00Z"));
});

test("an expired domain with no deletion status gets a low-confidence estimate from its expiry", () => {
  const record = parseRdap(rdap("example.com", ["active"], { expiration: "2026-10-01T00:00:00Z" }), "example.com");
  expect(record.state).toBe("expired");
  expect(record.drop).toEqual({ at: new Date("2026-12-20T00:00:00Z"), confidence: "low", basis: "expiry + periods" });
});

test("a registered domain has no drop estimate", () => {
  const record = parseRdap(rdap("example.com", ["active"], { expiration: "2030-01-01T00:00:00Z" }), "example.com");
  expect(record).toMatchObject({ state: "registered", statuses: ["ok"] });
  expect(record.drop).toBeUndefined();
});

test("a date the registry publishes for release wins over formulas", () => {
  const text =
    "domain: EXAMPLE.RU\nstate: REGISTERED\npaid-till: 2026-10-01T21:00:00Z\nfree-date: 2026-11-02\nnserver: ns1.example.net.";
  const record = parseWhois(text, "example.ru");
  expect(record.state).toBe("expired");
  expect(record.drop).toEqual({ at: new Date("2026-11-02T00:00:00Z"), confidence: "high", basis: "registry date" });
});

test("TLD schedules override the registry's", () => {
  const record = parseRdap(
    rdap("example.ai", ["pending delete"], {
      "last changed": "2026-10-10T15:00:00Z",
      expiration: "2026-08-01T00:00:00Z",
    }),
    "example.ai",
  );
  expect(record.drop).toEqual({ at: new Date("2026-11-08T17:00:00Z"), confidence: "high", basis: "tld schedule" });
});

test("records name the registry operator for the TLD, including second-level suffixes", () => {
  expect(parseRdap(rdap("example.org", [], {}), "example.org").registry).toEqual({
    id: "pir",
    name: "Public Interest Registry",
  });
  expect(parseRdap(rdap("example.co.uk", [], {}), "example.co.uk")).toMatchObject({
    tld: "co.uk",
    registry: { id: "nominet" },
  });
});
