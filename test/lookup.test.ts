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
const whoisOnly = { com: { rdap: false as const, whois: "whois.registry.test" } };

test("an RDAP 404 means the domain is available", async () => {
  const { fetch } = httpServer(() => ({ status: 404, body: "" }));
  const result = await lookup("example.com", { fetch, servers });
  expect(result).toMatchObject({ state: "available", source: "rdap", hops: [{ protocol: "rdap" }] });
});

test("a failing RDAP server falls back to WHOIS", async () => {
  const { fetch } = httpServer(() => ({ status: 503, body: "down" }));
  const { connect } = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("example.com", { fetch, connect, servers });
  expect(result.state).toBe("registered");
  expect(result.source).toBe("whois");
  expect(result.hops.map((hop) => hop.protocol)).toEqual(["rdap", "whois"]);
});

test("rdap: only never opens a socket and reports rate limits with Retry-After", async () => {
  const { fetch } = httpServer(() => ({ status: 429, body: "", headers: { "retry-after": "30" } }));
  const whois = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("example.com", { fetch, connect: whois.connect, servers, rdap: "only" });
  expect(result.state).toBe("unknown");
  expect(result.error).toMatchObject({ code: "rate_limited", retryAfter: 30 });
  expect(whois.connections).toEqual([]);
});

test("rdap: false for a TLD goes straight to port 43 and normalizes the record", async () => {
  const { fetch, urls } = httpServer(() => ({ status: 200, body: RDAP_DOMAIN }));
  const { connect } = whoisServer(() => WHOIS_REGISTRY);
  const result = await lookup("Example.COM.", { fetch, connect, servers: whoisOnly });
  expect(urls).toEqual([]);
  expect(result).toMatchObject({
    domain: "example.com",
    registrar: { name: "Example Registrar, Inc." },
    creationDate: new Date("2001-02-03T04:05:06Z"),
    expirationDate: new Date("2030-02-03T04:05:06Z"),
    nameservers: ["ns1.example.net"],
  });
});

test("follow: registrar queries the referral server and keeps the registry's dates", async () => {
  const server = whoisServer((host) =>
    host === "whois.registrar.test"
      ? "Registrar: Example Registrar, Inc.\nRegistrar Abuse Contact Email: Abuse@Registrar.test\nCreation Date: 1999-01-01"
      : WHOIS_REGISTRY,
  );
  const result = await lookup("example.com", { connect: server.connect, servers: whoisOnly, follow: "registrar" });
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
  await fresh.lookup("one.zz", { fetch, rdap: "only" });
  await fresh.lookup("two.zz", { fetch, rdap: "only" });
  expect(urls.filter((url) => url.endsWith("dns.json"))).toHaveLength(1);
  expect(urls).toContain("https://rdap.zz.test/domain/two.zz");
});

test("WHOIS hosts come from whois.iana.org when the TLD isn't in the server list", async () => {
  const server = whoisServer((host) =>
    host === "whois.iana.org" ? "domain: YY\nwhois: whois.nic.yy\n" : "% No match",
  );
  const result = await lookup("example.yy", { connect: server.connect, servers: { yy: { rdap: false } } });
  expect(server.queries).toEqual([
    { host: "whois.iana.org", query: "yy" },
    { host: "whois.nic.yy", query: "example.yy" },
  ]);
  expect(result.state).toBe("available");
});

test("registries that need a query format get it", async () => {
  const server = whoisServer(() => "Domain: nic.de\nStatus: free");
  await lookup("nic.de", { connect: server.connect, servers: { de: { rdap: false } } });
  expect(server.queries).toEqual([{ host: "whois.denic.de", query: "-T dn nic.de" }]);
});

test("international names are queried in punycode and returned in both forms", async () => {
  const server = whoisServer(() => "Domain: xn--bcher-kva.de\nStatus: free");
  const result = await lookup("Bücher.de", { connect: server.connect, servers: { de: { rdap: false } } });
  expect(server.queries.at(0)?.query).toBe("-T dn xn--bcher-kva.de");
  expect(result).toMatchObject({ domain: "xn--bcher-kva.de", unicode: "bücher.de" });
});

test("an empty WHOIS reply is treated as throttling", async () => {
  const { connect } = whoisServer(() => "");
  const result = await lookup("example.com", { connect, servers: whoisOnly });
  expect(result.error?.code).toBe("rate_limited");
});

test("a refused connection is retried once, then reported as a network error", async () => {
  const { connect, connections } = whoisServer(() => WHOIS_REGISTRY, ["whois.registry.test"]);
  const result = await lookup("example.com", { connect, servers: whoisOnly });
  expect(connections).toEqual(["whois.registry.test", "whois.registry.test"]);
  expect(result).toMatchObject({ state: "unknown", error: { code: "network" } });
});

test("the timeout bounds the whole lookup and returns state unknown", async () => {
  const hang: typeof fetch = (_input, init) =>
    new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
  const result = await lookup("example.com", { fetch: hang, servers, rdap: "only", timeout: 50 });
  expect(result.error?.code).toBe("timeout");
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
  const result = await lookup("example.com", { connect: slowConnect, servers: whoisOnly, timeout: 50 });
  expect(result.error?.code).toBe("timeout");
  expect(Date.now() - started).toBeLessThan(140);
  await new Promise((resolve) => setTimeout(resolve, 150));
  expect(lateSocketClosed).toBe(true);
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
    fresh.lookup("one.zz", { fetch: slowBootstrap, rdap: "only", timeout: 20 }),
    fresh.lookup("two.zz", { fetch: slowBootstrap, rdap: "only", timeout: 5000 }),
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
  const first = await fresh.lookup("example.yy", { connect: server.connect, servers: { yy: { rdap: false } } });
  const second = await fresh.lookup("example.yy", { connect: server.connect, servers: { yy: { rdap: false } } });
  expect(first.state).toBe("unknown");
  expect(second.state).toBe("available");
});
