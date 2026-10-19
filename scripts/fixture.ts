import { mkdir, writeFile } from "node:fs/promises";
import { lookup } from "#runtime/node.ts";

const TIMEOUT = 20_000;
const FOLLOW = "--follow";

async function capture(input: string, follow: boolean): Promise<void> {
  const statuses: number[] = [];
  const recording: typeof fetch = async (request, init) => {
    const response = await fetch(request, init);
    statuses.push(response.status);
    return response;
  };
  const options = { timeout: TIMEOUT, ...(follow && { follow: "registrar" as const }) };
  const rdap = await lookup(input, { ...options, protocol: "rdap", fetch: recording });
  const whois = await lookup(input, { ...options, protocol: "whois" });
  const dir = `test/fixtures/${rdap.tld}`;
  await mkdir(dir, { recursive: true });
  const suffixes = ["", ".registrar"];
  for (const [index, hop] of rdap.hops.entries()) {
    const status = statuses.at(index - rdap.hops.length) ?? "";
    await writeFile(`${dir}/${rdap.domain}.rdap${suffixes[index]}`, `${status}\n${hop.raw}`);
  }
  for (const [index, hop] of whois.hops.entries()) {
    await writeFile(`${dir}/${whois.domain}.whois${suffixes[index]}`, `${hop.server}\n${hop.raw}`);
  }
  const servers = (result: typeof rdap): string =>
    result.hops.map((hop) => hop.server).join(" -> ") || (result.error?.message ?? "");
  console.log(`${rdap.domain}: rdap ${servers(rdap)} whois ${servers(whois)}`);
}

const follow = process.argv.includes(FOLLOW);
const queue = process.argv.slice(2).filter((argument) => argument !== FOLLOW);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await capture(next, follow).catch((error: unknown) => console.error(`${next}: ${String(error)}`));
    }
  }),
);
