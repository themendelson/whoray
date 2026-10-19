import { expect, test } from "vitest";
import type { DomainRecord } from "#runtime/node.ts";
import { parseRdap, parseWhois } from "#runtime/node.ts";
import { freezeTime } from "./support.ts";

freezeTime("2026-10-16T12:00:00Z");

function rdap(domain: string, status: string[], events: Record<string, string> = {}): DomainRecord {
  const eventList = Object.entries(events).map(([eventAction, eventDate]) => ({ eventAction, eventDate }));
  return parseRdap({ objectClassName: "domain", ldhName: domain, status, events: eventList }, domain);
}

test("a pendingDelete .com drops six days after its last update", () => {
  const record = rdap("example.com", ["pending delete"], {
    "last changed": "2026-10-14T18:00:00Z",
    expiration: "2026-08-01T00:00:00Z",
  });
  expect(record.state).toBe("pendingDelete");
  expect(record.dropDate).toEqual(new Date("2026-10-20T18:00:00Z"));
});

test("a .com updated five days ago is still within its pendingDelete", () => {
  const record = rdap("example.com", ["pending delete"], {
    "last changed": "2026-10-11T09:30:00Z",
    expiration: "2026-09-11T04:00:00Z",
  });
  expect(record.dropDate).toEqual(new Date("2026-10-17T09:30:00Z"));
});

test("a domain in redemption drops once its redemption cycle ends, pending delete included", () => {
  const record = rdap("example.com", ["redemption period", "pending delete"], {
    "last changed": "2026-10-01T00:00:00Z",
    expiration: "2026-08-20T00:00:00Z",
  });
  expect(record.state).toBe("redemption");
  expect(record.dropDate).toEqual(new Date("2026-11-05T00:00:00Z"));
});

test("a past expiry in the auto-renew period is a renewed domain, not an expired one", () => {
  const record = rdap("nic.vip", ["auto renew period", "server delete prohibited"], {
    expiration: "2026-09-07T04:15:49Z",
  });
  expect(record.state).toBe("registered");
  expect(record.dropDate).toBeUndefined();
});

test("an expired domain without deletion statuses gets no drop date when its registry's schedule is known", () => {
  const record = rdap("example.com", ["active"], { expiration: "2026-10-01T00:00:00Z" });
  expect(record.state).toBe("expired");
  expect(record.dropDate).toBeUndefined();
});

test("a TLD without lifecycle data gets a generic estimate from its expiry", () => {
  const record = rdap("example.zz", ["active"], { expiration: "2026-10-01T00:00:00Z" });
  expect(record.state).toBe("expired");
  expect(record.dropDate).toEqual(new Date("2026-12-20T00:00:00Z"));
});

test("a registered domain has no drop estimate", () => {
  const record = rdap("example.com", ["active"], { expiration: "2030-01-01T00:00:00Z" });
  expect(record).toMatchObject({ state: "registered", statuses: ["ok"] });
  expect(record.dropDate).toBeUndefined();
});

test("an expired .org.il drops 61 days after its validity, like .co.il", () => {
  const text = "domain: example.org.il\nassigned: 05-06-1999\nvalidity: 05-09-2026\nstatus: Transfer Locked";
  const record = parseWhois(text, "example.org.il");
  expect(record).toMatchObject({ tld: "org.il", state: "expired" });
  expect(record.dropDate).toEqual(new Date("2026-11-05T00:00:00Z"));
});

test("a date the registry publishes for release wins over formulas", () => {
  const text =
    "domain: EXAMPLE.RU\nstate: REGISTERED\npaid-till: 2026-10-01T21:00:00Z\nfree-date: 2026-11-02\nnserver: ns1.example.net.";
  const record = parseWhois(text, "example.ru");
  expect(record.state).toBe("expired");
  expect(record.dropDate).toEqual(new Date("2026-11-02T00:00:00Z"));
});

test("TLD schedules override the registry's", () => {
  const record = rdap("example.ai", ["pending delete"], {
    "last changed": "2026-10-10T15:00:00Z",
    expiration: "2026-08-01T00:00:00Z",
  });
  expect(record.dropDate).toEqual(new Date("2026-11-08T17:00:00Z"));
});

test("records name the registry operator for the TLD, including second-level suffixes", () => {
  expect(rdap("example.org", []).registry).toEqual({
    id: "public-interest-registry",
    name: "Public Interest Registry",
  });
  expect(rdap("example.co.uk", [])).toMatchObject({ tld: "co.uk", registry: { id: "nominet" } });
});
