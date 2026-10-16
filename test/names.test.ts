import { expect, test } from "vitest";
import { lookup, parseWhois } from "#node.ts";
import { whoisServer } from "./support.ts";

const nameOf = (input: string): { domain: string; tld: string } => {
  const { domain, tld } = parseWhois("", input);
  return { domain, tld };
};

test("a hostname is looked up as the domain registered under its public suffix", async () => {
  const server = whoisServer(() => "Domain not found.");
  const servers = { com: { rdap: false as const, whois: "whois.registry.test" } };
  const result = await lookup("www.Example.com", { connect: server.connect, servers });
  expect(server.queries).toEqual([{ host: "whois.registry.test", query: "example.com" }]);
  expect(result.domain).toBe("example.com");
});

test("wildcard and exception rules of the public suffix list apply", () => {
  expect(nameOf("www.example.anything.ck")).toEqual({ domain: "example.anything.ck", tld: "anything.ck" });
  expect(nameOf("mail.www.ck")).toEqual({ domain: "www.ck", tld: "ck" });
  expect(nameOf("www.city.kawasaki.jp")).toEqual({ domain: "city.kawasaki.jp", tld: "kawasaki.jp" });
});

test("a suffix from the servers option counts as a public suffix", async () => {
  const server = whoisServer(() => "Domain not found.");
  const result = await lookup("www.example.uk.com", {
    connect: server.connect,
    servers: { "uk.com": { rdap: false, whois: "whois.centralnic.test" } },
  });
  expect(server.queries).toEqual([{ host: "whois.centralnic.test", query: "example.uk.com" }]);
  expect(result.tld).toBe("uk.com");
});

test("a public suffix on its own isn't a domain name", () => {
  expect(() => parseWhois("", "co.uk")).toThrow(TypeError);
  expect(() => parseWhois("", "anything.ck")).toThrow(TypeError);
});
