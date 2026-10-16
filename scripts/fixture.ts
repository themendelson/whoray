import { mkdir, writeFile } from "node:fs/promises";
import { rdap, whois } from "#node.ts";

const TIMEOUT = 20_000;

async function capture(input: string): Promise<void> {
  const statuses: number[] = [];
  const recording: typeof fetch = async (request, init) => {
    const response = await fetch(request, init);
    statuses.push(response.status);
    return response;
  };
  const rdapResult = await rdap(input, { fetch: recording, timeout: TIMEOUT });
  const whoisResult = await whois(input, { timeout: TIMEOUT });
  const dir = `test/fixtures/${rdapResult.tld}`;
  await mkdir(dir, { recursive: true });
  const [rdapHop] = rdapResult.hops;
  if (rdapHop) await writeFile(`${dir}/${rdapResult.domain}.rdap`, `${statuses.at(-1) ?? ""}\n${rdapHop.raw}`);
  const [whoisHop] = whoisResult.hops;
  if (whoisHop) await writeFile(`${dir}/${whoisResult.domain}.whois`, `${whoisHop.server}\n${whoisHop.raw}`);
  console.log(
    `${rdapResult.domain}: rdap ${rdapHop?.server ?? rdapResult.error?.message} whois ${whoisHop?.server ?? whoisResult.error?.message}`,
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
