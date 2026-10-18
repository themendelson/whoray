import { expect, test } from "vitest";
import { lookup } from "#runtime/browser.ts";
import { httpServer, whoisServer } from "./support.ts";

const servers = { com: { rdap: "https://rdap.test/", whois: "whois.registry.test" } };

test("a browser lookup asks only RDAP, so an RDAP failure is the error it reports", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 503, body: "" }));
  const result = await lookup("example.com", { fetch, servers });
  expect(urls).toEqual(["https://rdap.test/domain/example.com"]);
  expect(result).toMatchObject({ state: "unknown", source: "rdap", error: { message: "HTTP 503" } });
});

test("a browser lookup with a connect hook asks WHOIS first", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 404, body: "" }));
  const { connect } = whoisServer(() => "No match for domain");
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(urls).toEqual([]);
  expect(result).toMatchObject({ state: "available", source: "whois" });
});

test("asking for WHOIS from a browser says how to get an answer", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const result = await lookup("example.com", { fetch, servers, protocol: "whois" });
  expect(result.error?.message).toContain('protocol: "rdap"');
});
