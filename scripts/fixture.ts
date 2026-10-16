import { mkdir, writeFile } from "node:fs/promises";
import { lookup } from "#runtime/node.ts";

const TIMEOUT = 20_000;

async function capture(input: string): Promise<void> {
  const statuses: number[] = [];
  const recording: typeof fetch = async (request, init) => {
    const response = await fetch(request, init);
    statuses.push(response.status);
    return response;
  };
  const rdap = await lookup(input, { protocol: "rdap", fetch: recording, timeout: TIMEOUT });
  const whois = await lookup(input, { protocol: "whois", timeout: TIMEOUT });
  const dir = `test/fixtures/${rdap.tld}`;
  await mkdir(dir, { recursive: true });
  const [rdapHop] = rdap.hops;
  if (rdapHop) await writeFile(`${dir}/${rdap.domain}.rdap`, `${statuses.at(-1) ?? ""}\n${rdapHop.raw}`);
  const [whoisHop] = whois.hops;
  if (whoisHop) await writeFile(`${dir}/${whois.domain}.whois`, `${whoisHop.server}\n${whoisHop.raw}`);
  console.log(
    `${rdap.domain}: rdap ${rdapHop?.server ?? rdap.error?.message} whois ${whoisHop?.server ?? whois.error?.message}`,
  );
}

const queue = process.argv.slice(2);
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await capture(next).catch((error: unknown) => console.error(`${next}: ${String(error)}`));
    }
  }),
);
