import { untilAborted } from "#abort.ts";
import { Memo } from "#memo.ts";
import type { Connect, Socket } from "#types.ts";

const encoder = new TextEncoder();
const ignore = (): void => undefined;

export async function queryWhois(connect: Connect, host: string, query: string, signal: AbortSignal): Promise<string> {
  const socket = await untilAborted(connect(host, 43, signal), signal, close);
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const hangUp = (): void => {
    void reader.cancel().catch(ignore);
    void writer.abort().catch(ignore);
  };
  signal.addEventListener("abort", hangUp, { once: true });
  let replied = false;
  try {
    signal.throwIfAborted();
    await writer.write(encoder.encode(`${query}\r\n`));
    const chunks: Uint8Array[] = [];
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) chunks.push(chunk.value);
    signal.throwIfAborted();
    replied = true;
    return decode(concat(chunks));
  } finally {
    signal.removeEventListener("abort", hangUp);
    if (replied) void writer.close().catch(ignore);
    else hangUp();
  }
}

function close(socket: Socket): void {
  void socket.readable.cancel().catch(ignore);
  void socket.writable.abort().catch(ignore);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

function decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

const DAY = 86_400_000;
const IANA_TIMEOUT = 15_000;
const ianaHosts = new Memo<string | undefined>(DAY);

export function ianaWhoisHost(connect: Connect, tld: string, signal: AbortSignal): Promise<string | undefined> {
  const load = (): Promise<string | undefined> =>
    queryWhois(connect, "whois.iana.org", tld, AbortSignal.timeout(IANA_TIMEOUT)).then(whoisHostIn);
  return ianaHosts.get(tld, load, signal);
}

function whoisHostIn(reply: string): string | undefined {
  if (!/^domain:|returned 0 objects/m.test(reply)) throw new Error("whois.iana.org sent no TLD record");
  return /^whois:[ \t]*(\S+)/m.exec(reply)?.[1]?.toLowerCase();
}
