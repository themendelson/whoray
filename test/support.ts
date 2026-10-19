import { readdirSync, readFileSync } from "node:fs";
import { vi } from "vitest";
import type { Lookup } from "#runtime/node.ts";
import type { Connect } from "#types.ts";

export interface Capture {
  tld: string;
  domain: string;
  protocol: "rdap" | "whois";
  path: string;
  header: string;
  body: string;
}

export function captures(): Capture[] {
  return readdirSync("test/fixtures").flatMap((tld) =>
    readdirSync(`test/fixtures/${tld}`).flatMap((file): Capture[] => {
      const match = /^(.+)\.(rdap|whois)$/.exec(file);
      const protocol = match?.[2];
      if (match?.[1] === undefined || (protocol !== "rdap" && protocol !== "whois")) return [];
      const path = `test/fixtures/${tld}/${file}`;
      return [{ tld, domain: match[1], protocol, path, ...fixture(path) }];
    }),
  );
}

export function fixture(path: string): Pick<Capture, "header" | "body"> {
  const raw = readFileSync(path, "utf8");
  const newline = raw.indexOf("\n");
  return { header: raw.slice(0, newline), body: raw.slice(newline + 1) };
}

export interface FakeServer {
  connect: Connect;
  connections: string[];
  queries: { host: string; query: string }[];
}

export function whoisServer(reply: (host: string, query: string) => string, down: string[] = []): FakeServer {
  const queries: { host: string; query: string }[] = [];
  const connections: string[] = [];
  const connect: Connect = async (host) => {
    connections.push(host);
    if (down.includes(host)) throw new Error(`connect ECONNREFUSED ${host}:43`);
    let received: (query: string) => void = () => undefined;
    const query = new Promise<string>((resolve) => {
      received = resolve;
    });
    return {
      writable: new WritableStream({
        write(chunk) {
          const text = new TextDecoder().decode(chunk).trim();
          queries.push({ host, query: text });
          received(text);
        },
      }),
      readable: new ReadableStream({
        async start(controller) {
          controller.enqueue(new TextEncoder().encode(reply(host, await query)));
          controller.close();
        },
      }),
    };
  };
  return { connect, connections, queries };
}

interface HttpReply {
  status: number;
  body: string;
  headers?: Record<string, string>;
}

export function httpServer(reply: (url: string) => HttpReply | Promise<HttpReply>): {
  fetch: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    urls.push(url);
    const { status, body, headers } = await reply(url);
    return new Response(body, { status, ...(headers && { headers }) });
  };
  return { fetch: fakeFetch, urls };
}

export const silentServer: Connect = async () => ({ writable: new WritableStream(), readable: new ReadableStream() });

export function ianaBootstrap(tld: string, base: string): HttpReply {
  return { status: 200, body: JSON.stringify({ services: [[[tld], [base]]] }) };
}

export async function freshLookup(): Promise<Lookup> {
  vi.resetModules();
  const fresh = await import("#runtime/node.ts");
  return fresh.lookup;
}
