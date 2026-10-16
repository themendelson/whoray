import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { lookup, parseRdap, parseWhois } from "whoray";

const fixture = (path) => readFileSync(`test/fixtures/${path}`, "utf8").split("\n").slice(1).join("\n");
const commonjs = createRequire(import.meta.url)("whoray");

assert.equal(parseWhois(fixture("com/nic.com.whois"), "nic.com").state, "registered");
assert.equal(commonjs.parseWhois(fixture("com/nic.com.whois"), "nic.com").state, "registered");
assert.equal(parseRdap(JSON.parse(fixture("org/nic.org.rdap")), "nic.org").registry?.id, "public-interest-registry");

const reply = fixture("com/whoray-unregistered-7x9q.com.whois");
const connect = async () => ({
  writable: new WritableStream(),
  readable: new ReadableStream({
    start: (controller) => controller.close(controller.enqueue(new TextEncoder().encode(reply))),
  }),
});
const result = await lookup("whoray-unregistered-7x9q.com", {
  connect,
  protocol: "whois",
  servers: { com: { whois: "whois.test" } },
});
assert.equal(result.state, "available");
console.log(`whoray works on Node ${process.versions.node}`);
