import { ignore, untilAborted } from "#abort.ts";
import type { Name } from "#domain.ts";
import type { Found } from "#parse/found.ts";
import { readWhois } from "#parse/whois.ts";
import type { Connect } from "#types.ts";

const encoder = new TextEncoder();

interface Closable {
  readable: { cancel(): Promise<void> };
  writable: { abort(): Promise<void> };
}

function hangUp({ readable, writable }: Closable): void {
  void readable.cancel().catch(ignore);
  void writable.abort().catch(ignore);
}

export async function queryWhois(connect: Connect, host: string, query: string, signal: AbortSignal): Promise<string> {
  const socket = await untilAborted(connect(host, 43, signal), signal, hangUp);
  const stream = { readable: socket.readable.getReader(), writable: socket.writable.getWriter() };
  const abort = (): void => hangUp(stream);
  signal.addEventListener("abort", abort, { once: true });
  let replied = false;
  try {
    signal.throwIfAborted();
    await stream.writable.write(encoder.encode(`${query}\r\n`));
    const chunks: Uint8Array[] = [];
    for (let chunk = await stream.readable.read(); !chunk.done; chunk = await stream.readable.read()) {
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    replied = true;
    return decode(concat(chunks));
  } finally {
    signal.removeEventListener("abort", abort);
    if (replied) void stream.writable.close().catch(ignore);
    else hangUp(stream);
  }
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

export function readWhoisReply(text: string, name: Name): Found {
  if (text.trim() === "") return { kind: "error", code: "rate_limited", message: "Empty reply, usually throttling" };
  return readWhois(text, name);
}
