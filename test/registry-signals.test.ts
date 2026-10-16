import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { lookup, parseRdap, parseWhois } from "#node.ts";
import { httpServer, whoisServer } from "./support.ts";

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
});
afterAll(() => vi.useRealTimers());

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

test("registries with a dropzone release names 12 hours after their scheduled deletion", () => {
  const record = parseRdap(
    {
      objectClassName: "domain",
      status: ["pending delete"],
      events: [
        { eventAction: "expiration", eventDate: "2026-08-01T00:00:00Z" },
        { eventAction: "last changed", eventDate: "2026-10-14T00:00:00Z" },
      ],
    },
    "example.org",
  );
  expect(record).toMatchObject({
    deletionDate: new Date("2026-10-19T00:00:00Z"),
    dropDate: new Date("2026-10-19T12:00:00Z"),
  });
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

test("throttling and refusal words in a reply's terms of use don't make it an error", () => {
  const text =
    "This name is unknown to us.\n\nTerms: abuse will get you permanently blacklisted. Copying is not permitted.";
  expect(parseWhois(text, "example.xyz").error?.code).toBe("unparseable");
});

test("throttling and refusal notices at the top of a reply are errors", () => {
  expect(parseWhois("Error: ratelimit exceeded", "example.nl").error?.code).toBe("rate_limited");
  expect(parseWhois("Requests of this client are not permitted.", "example.ch").error?.code).toBe("blocked");
});

test("a notice written as a comment error after the server's header is still read", () => {
  const text =
    "% This is the Example Whois server.\n% Use of this service is not permitted for marketing.\n\n%ERROR:201: access denied";
  expect(parseWhois(text, "example.cz").error?.code).toBe("blocked");
});

const withAddress = (parameters: object, parts: string[]): unknown => ({
  objectClassName: "domain",
  entities: [{ roles: ["registrant"], vcardArray: ["vcard", [["adr", parameters, "text", parts]]] }],
});

test("an RDAP registrant's country is the address's country part, or its cc parameter", () => {
  const blankCountry = ["", "", "1 Main St", "Mountain View", "CA", "94043", ""];
  expect(parseRdap(withAddress({}, blankCountry), "example.com").registrant).toBeUndefined();
  expect(parseRdap(withAddress({}, ["", "", "", "", "Quebec", "", "CA"]), "example.ca").registrant).toEqual({
    country: "CA",
  });
  expect(parseRdap(withAddress({ cc: "us" }, blankCountry), "example.com").registrant).toEqual({ country: "US" });
});
