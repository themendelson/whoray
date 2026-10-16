import { mkdir, writeFile } from "node:fs/promises";
import { servers } from "#data/servers.ts";
import { normalize } from "#domain.ts";
import { hasLifecycleData, lastLabel } from "#lifecycle.ts";
import { fetchRdap, ianaRdapBase } from "#rdap.ts";
import { connect } from "#socket/node.ts";
import { ianaWhoisHost, queryWhois } from "#whois.ts";

const knownSuffix = (suffix: string): boolean => suffix in servers || hasLifecycleData(suffix);

async function capture(input: string): Promise<void> {
  const { domain, tld } = normalize(input, knownSuffix);
  const dir = `test/fixtures/${tld}`;
  await mkdir(dir, { recursive: true });
  const signal = AbortSignal.timeout(20_000);
  const entry = servers[tld] ?? servers[lastLabel(tld)];
  const rdapBase = entry?.rdap ?? (await ianaRdapBase(fetch, lastLabel(tld), signal).catch(() => undefined));
  if (rdapBase !== undefined) {
    const reply = await fetchRdap(fetch, `${rdapBase}domain/${domain}`, signal).catch((error: unknown) =>
      String(error),
    );
    const saved = typeof reply === "string" ? reply : `${reply.status}\n${reply.body}`;
    await writeFile(`${dir}/${domain}.rdap`, saved);
  }
  const host = entry?.whois ?? (await ianaWhoisHost(connect, lastLabel(tld), signal).catch(() => undefined));
  if (host !== undefined) {
    const query = (entry?.query ?? "{domain}").replace("{domain}", domain);
    const reply = await queryWhois(connect, host, query, signal).catch((error: unknown) => `ERROR ${String(error)}`);
    await writeFile(`${dir}/${domain}.whois`, `${host}\n${reply}`);
  }
  console.log(`${domain}: rdap ${rdapBase ?? "-"} whois ${host ?? "-"}`);
}

const queue = process.argv.slice(2);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await capture(next).catch((error: unknown) => console.error(`${next}: ${String(error)}`));
    }
  }),
);
