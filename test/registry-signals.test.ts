import { expect, test } from "vitest";
import { lookup, parseRdap, parseWhois } from "#runtime/node.ts";
import { freezeTime, httpServer, whoisServer } from "./support.ts";

freezeTime("2026-10-16T12:00:00Z");

test("a WHOIS reply that opens with Dropzone means the registry holds the deleted name", () => {
  expect(parseWhois("Dropzone: this name is pending release.\nDomain not found.", "example.io").state).toBe("dropzone");
});

test("Identity Digital's platinums@ contact on an available name marks it premium", () => {
  const record = parseWhois("Contact platinums@identity.digital for this name.\nDomain not found.", "example.io");
  expect(record).toMatchObject({ state: "available", premium: true });
});

test("a DPML block on the first line means reserved", () => {
  expect(parseWhois("This name is protected by the DPML Brand Protection policy.", "example.io").state).toBe(
    "reserved",
  );
});

test("'allowed queries exceeded' is a rate limit, not an unparseable reply", () => {
  expect(parseWhois("Number of allowed queries exceeded.", "example.de").error?.code).toBe("rate_limited");
});

test("'Domain not renewed. Being revoked' counts as pending delete", () => {
  const text = "domain: example.example\nnserver: ns1.example.net\nremarks: Domain not renewed. Being revoked";
  expect(parseWhois(text, "example.ru")).toMatchObject({ state: "pendingDelete", statuses: ["pendingDelete"] });
});

test(".fr drops 30 days after its deletion date", () => {
  const record = parseRdap(
    {
      objectClassName: "domain",
      status: ["pending delete"],
      events: [
        { eventAction: "expiration", eventDate: "2026-09-01T00:00:00Z" },
        { eventAction: "deletion", eventDate: "2026-10-10T00:00:00Z" },
      ],
    },
    "example.fr",
  );
  expect(record.dropDate).toEqual(new Date("2026-11-09T00:00:00Z"));
});

test("an unmapped TLD gets its registry from the reply text", () => {
  const text = "Domain Name: example.zz\nCreation Date: 2020-01-01\nAll data is (c) CentralNic Ltd";
  expect(parseWhois(text, "example.zz").registry).toEqual({ id: "centralnic", name: "CentralNic" });
});

test("WHOIS replies keep the registry database timestamp", () => {
  const text =
    "Domain Name: example.com\nCreation Date: 2020-01-01\n>>> Last update of WHOIS database: 2026-10-16T08:00:00Z <<<";
  expect(parseWhois(text, "example.com").snapshotDate).toEqual(new Date("2026-10-16T08:00:00Z"));
});

test("a premium marker in the WHOIS reply survives a full lookup", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 404, body: "" }));
  const { connect } = whoisServer(() => "Contact platinums@identity.digital for this name.\nDomain not found.");
  const result = await lookup("example.io", { fetch, connect });
  expect(urls).toEqual([]);
  expect(result).toMatchObject({ state: "available", premium: true, source: "whois" });
});
