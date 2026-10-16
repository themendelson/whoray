import { expect, test, vi } from "vitest";
import { lookup } from "#node.ts";
import type { Connect } from "#types.ts";
import { httpServer, whoisServer } from "./support.ts";

const RDAP_DOMAIN = JSON.stringify({
  objectClassName: "domain",
  ldhName: "example.com",
  status: ["client transfer prohibited"],
  events: [
    { eventAction: "registration", eventDate: "2001-02-03T04:05:06Z" },
    { eventAction: "expiration", eventDate: "2030-02-03T04:05:06Z" },
  ],
  nameservers: [{ ldhName: "NS1.EXAMPLE.NET." }],
});

const WHOIS_REGISTRY = [
  "Domain Name: EXAMPLE.COM",
  "Registrar WHOIS Server: whois.registrar.test",
  "Registrar: Example Registrar, Inc.",
  "Creation Date: 2001-02-03T04:05:06Z",
  "Registry Expiry Date: 2030-02-03T04:05:06Z",
  "Name Server: NS1.EXAMPLE.NET",
].join("\n");

const servers = { com: { rdap: "https://rdap.test/", whois: "whois.registry.test" } };

const silent: Connect = async () => ({
  writable: new WritableStream(),
  readable: new ReadableStream(),
});

test("WHOIS answers first and RDAP isn't asked", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 200, body: RDAP_DOMAIN }));
  const { connect } = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("Example.COM.", { fetch, connect, servers });
  expect(urls).toEqual([]);
  expect(result).toMatchObject({
    domain: "example.com",
    source: "whois",
    registrar: { name: "Example Registrar, Inc." },
    creationDate: new Date("2001-02-03T04:05:06Z"),
    expirationDate: new Date("2030-02-03T04:05:06Z"),
    nameservers: ["ns1.example.net"],
  });
});

test("a WHOIS server that can't be reached hands the lookup to RDAP", async () => {
  const { fetch } = httpServer(() => ({ status: 200, body: RDAP_DOMAIN }));
  const { connect, connections } = whoisServer(() => WHOIS_REGISTRY, ["whois.registry.test"]);
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(connections).toEqual(["whois.registry.test", "whois.registry.test"]);
  expect(result).toMatchObject({ state: "registered", source: "rdap", hops: [{ protocol: "rdap" }] });
});

test("a TLD without WHOIS goes straight to RDAP", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const whois = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("example.com", {
    fetch,
    connect: whois.connect,
    servers: { com: { whois: false, rdap: "https://rdap.test/" } },
  });
  expect(whois.connections).toEqual([]);
  expect(result).toMatchObject({ state: "available", source: "rdap" });
});

test("a retired WHOIS service hands the lookup to RDAP", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const { connect } = whoisServer(() => "Notice: the WHOIS service has been retired. Use RDAP.");
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(result).toMatchObject({ state: "available", source: "rdap" });
});

test("RDAP takes over when WHOIS hasn't answered by half the timeout", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const result = await lookup("example.com", { fetch, connect: silent, servers, timeout: 200 });
  expect(result).toMatchObject({ state: "available", source: "rdap" });
});

test("WHOIS keeps the whole timeout when there's no RDAP to hand over to", async () => {
  const result = await lookup("example.com", {
    connect: silent,
    servers: { com: { rdap: false, whois: "whois.registry.test" } },
    timeout: 100,
  });
  expect(result.error).toMatchObject({ code: "timeout", server: "whois.registry.test" });
});

test("an RDAP 404 doesn't overrule a WHOIS reply that wasn't a not-found", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const { connect } = whoisServer(() => "This name is subject to a policy we don't recognise.");
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(result).toMatchObject({ state: "unknown", source: "whois", error: { code: "unparseable" } });
});

test("an RDAP record replaces a WHOIS reply that couldn't be read", async () => {
  const { fetch } = httpServer(() => ({ status: 200, body: RDAP_DOMAIN }));
  const { connect } = whoisServer(() => "This name is subject to a policy we don't recognise.");
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(result).toMatchObject({ state: "registered", source: "rdap" });
});

test("when both protocols fail, the WHOIS error is reported with its server", async () => {
  const { fetch } = httpServer(() => ({ status: 503, body: "down" }));
  const { connect } = whoisServer(() => "", []);
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(result.error).toMatchObject({ code: "rate_limited", server: "whois.registry.test" });
  expect(result.hops.map((hop) => hop.server)).toEqual(["whois.registry.test", "rdap.test"]);
});

test("protocol: rdap never opens a socket and reports rate limits with Retry-After", async () => {
  const { fetch } = httpServer(() => ({ status: 429, body: "", headers: { "retry-after": "30" } }));
  const whois = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("example.com", { fetch, connect: whois.connect, servers, protocol: "rdap" });
  expect(result).toMatchObject({ state: "unknown", source: "rdap" });
  expect(result.error).toEqual({ code: "rate_limited", message: "HTTP 429", server: "rdap.test", retryAfter: 30 });
  expect(whois.connections).toEqual([]);
});

test("protocol: whois never fetches", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 200, body: RDAP_DOMAIN }));
  const { connect } = whoisServer(() => "");
  const result = await lookup("example.com", { fetch, connect, servers, protocol: "whois" });
  expect(urls).toEqual([]);
  expect(result.error?.code).toBe("rate_limited");
});

test("an RDAP 404 means the domain is available", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const result = await lookup("example.com", { fetch, servers, protocol: "rdap" });
  expect(result).toMatchObject({ state: "available", source: "rdap", hops: [{ protocol: "rdap" }] });
});

test("an RDAP base URL from the servers option works without a trailing slash", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 404, body: "" }));
  await lookup("example.com", { fetch, servers: { com: { rdap: "https://rdap.test/v1" } }, protocol: "rdap" });
  expect(urls).toEqual(["https://rdap.test/v1/domain/example.com"]);
});

test("follow: registrar queries the referral server and keeps the registry's dates", async () => {
  const server = whoisServer((host) =>
    host === "whois.registrar.test"
      ? "Registrar: Example Registrar, Inc.\nRegistrar Abuse Contact Email: Abuse@Registrar.test\nCreation Date: 1999-01-01"
      : WHOIS_REGISTRY,
  );
  const result = await lookup("example.com", { connect: server.connect, servers, follow: "registrar" });
  expect(server.queries.map((query) => query.host)).toEqual(["whois.registry.test", "whois.registrar.test"]);
  expect(result.registrar).toEqual({ name: "Example Registrar, Inc.", abuseEmail: "abuse@registrar.test" });
  expect(result.creationDate).toEqual(new Date("2001-02-03T04:05:06Z"));
});

test("an unknown TLD is resolved through IANA once and cached", async () => {
  vi.resetModules();
  const fresh = await import("#node.ts");
  const bootstrap = { services: [[["zz"], ["https://rdap.zz.test/"]]] };
  const { fetch, urls } = httpServer((url) =>
    url.endsWith("dns.json") ? { status: 200, body: JSON.stringify(bootstrap) } : { status: 404, body: "" },
  );
  await fresh.lookup("one.zz", { fetch, protocol: "rdap" });
  await fresh.lookup("two.zz", { fetch, protocol: "rdap" });
  expect(urls.filter((url) => url.endsWith("dns.json"))).toHaveLength(1);
  expect(urls).toContain("https://rdap.zz.test/domain/two.zz");
});

test("WHOIS hosts come from whois.iana.org when the TLD isn't in the server list", async () => {
  const server = whoisServer((host) =>
    host === "whois.iana.org" ? "domain: YY\nwhois: whois.nic.yy\n" : "% No match",
  );
  const result = await lookup("example.yy", { connect: server.connect, protocol: "whois" });
  expect(server.queries).toEqual([
    { host: "whois.iana.org", query: "yy" },
    { host: "whois.nic.yy", query: "example.yy" },
  ]);
  expect(result.state).toBe("available");
});

test("a TLD with no server anywhere is reported without a source", async () => {
  const server = whoisServer(() => "domain: XX\n");
  const result = await lookup("example.xx", { connect: server.connect, servers: { xx: { rdap: false } } });
  expect(result).toMatchObject({ state: "unknown", error: { code: "no_server" } });
  expect(result.source).toBeUndefined();
});

test("registries that need a query format get it", async () => {
  const server = whoisServer(() => "Domain: nic.de\nStatus: free");
  await lookup("nic.de", { connect: server.connect, protocol: "whois" });
  expect(server.queries).toEqual([{ host: "whois.denic.de", query: "-T dn nic.de" }]);
});

test("international names are queried in punycode and returned in both forms", async () => {
  const server = whoisServer(() => "Domain: xn--bcher-kva.de\nStatus: free");
  const result = await lookup("Bücher.de", { connect: server.connect, protocol: "whois" });
  expect(server.queries.at(0)?.query).toBe("-T dn xn--bcher-kva.de");
  expect(result).toMatchObject({ domain: "xn--bcher-kva.de", unicode: "bücher.de" });
});

test("an empty WHOIS reply is treated as throttling", async () => {
  const { connect } = whoisServer(() => "");
  const result = await lookup("example.com", { connect, servers, protocol: "whois" });
  expect(result.error?.code).toBe("rate_limited");
});

test("a refused connection is retried once, then reported as a network error", async () => {
  const { connect, connections } = whoisServer(() => WHOIS_REGISTRY, ["whois.registry.test"]);
  const result = await lookup("example.com", { connect, servers, protocol: "whois" });
  expect(connections).toEqual(["whois.registry.test", "whois.registry.test"]);
  expect(result).toMatchObject({ state: "unknown", error: { code: "network", server: "whois.registry.test" } });
});

test("the timeout bounds the whole lookup and returns state unknown", async () => {
  const hang: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
  const result = await lookup("example.com", { fetch: hang, servers, protocol: "rdap", timeout: 50 });
  expect(result.error).toMatchObject({ code: "timeout", server: "rdap.test" });
});

test("the timeout also bounds a connect hook that ignores the signal", async () => {
  let lateSocketClosed = false;
  const slowConnect: Connect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      writable: new WritableStream(),
      readable: new ReadableStream({
        cancel() {
          lateSocketClosed = true;
        },
      }),
    };
  };
  const started = Date.now();
  const result = await lookup("example.com", { connect: slowConnect, servers, protocol: "whois", timeout: 50 });
  expect(result.error?.code).toBe("timeout");
  expect(Date.now() - started).toBeLessThan(140);
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(lateSocketClosed).toBe(true);
});

test("aborting through the caller's signal rejects the lookup", async () => {
  const controller = new AbortController();
  controller.abort(new Error("cancelled"));
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  await expect(lookup("example.com", { fetch, servers, signal: controller.signal })).rejects.toThrow("cancelled");
});

test("input that isn't a domain name rejects the lookup", async () => {
  await expect(lookup("not a domain")).rejects.toThrow(TypeError);
});

test("one lookup timing out doesn't fail another waiting on the same IANA bootstrap", async () => {
  vi.resetModules();
  const fresh = await import("#node.ts");
  const bootstrap = { services: [[["zz"], ["https://rdap.zz.test/"]]] };
  const slowBootstrap: typeof fetch = async (input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith("dns.json")) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return new Response(JSON.stringify(bootstrap));
    }
    return new Response("", { status: 404 });
  };
  const [short, long] = await Promise.all([
    fresh.lookup("one.zz", { fetch: slowBootstrap, protocol: "rdap", timeout: 20 }),
    fresh.lookup("two.zz", { fetch: slowBootstrap, protocol: "rdap", timeout: 5000 }),
  ]);
  expect(short.error?.code).toBe("timeout");
  expect(long).toMatchObject({ state: "available", source: "rdap" });
});

test("a WHOIS host IANA didn't answer for is asked again on the next lookup", async () => {
  vi.resetModules();
  const fresh = await import("#node.ts");
  let ianaCalls = 0;
  const server = whoisServer((host) => {
    if (host !== "whois.iana.org") return "% No match";
    ianaCalls += 1;
    return ianaCalls === 1 ? "% Query rate exceeded" : "domain: YY\nwhois: whois.nic.yy\n";
  });
  const first = await fresh.lookup("example.yy", { connect: server.connect, protocol: "whois" });
  const second = await fresh.lookup("example.yy", { connect: server.connect, protocol: "whois" });
  expect(first.error).toMatchObject({ code: "network", server: "whois.iana.org" });
  expect(second.state).toBe("available");
});
