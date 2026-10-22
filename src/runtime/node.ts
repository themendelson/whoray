import { connect as connectHttp2 } from "node:http2";
import { createConnection } from "node:net";
import { Duplex } from "node:stream";
import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import type { Connect } from "#types.ts";

export * from "#core.ts";

const UPGRADE_REQUIRED = 426;

const connect: Connect = (host, port, signal) =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host, port, ...(signal && { signal }) });
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.off("error", reject);
      resolve(Duplex.toWeb(socket));
    });
  });

// Node's and Bun's fetch speak only HTTP/1.1, and some RDAP servers (.tw) answer it with 426.
const fetchWithHttp2: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== UPGRADE_REQUIRED) return response;
  await response.body?.cancel();
  return fetchOverHttp2(new Request(input, init));
};

function fetchOverHttp2(request: Request): Promise<Response> {
  const url = new URL(request.url);
  return new Promise((resolve, reject) => {
    const session = connectHttp2(url.origin);
    const fail = (error: unknown): void => {
      request.signal.removeEventListener("abort", abort);
      session.destroy();
      reject(error);
    };
    const abort = (): void => fail(request.signal.reason);
    request.signal.addEventListener("abort", abort, { once: true });
    session.on("error", fail);
    const stream = session.request({ ":path": `${url.pathname}${url.search}`, ...Object.fromEntries(request.headers) });
    stream.on("error", fail);
    stream.on("response", (head) => {
      const chunks: Uint8Array[] = [];
      stream.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      stream.on("end", () => {
        request.signal.removeEventListener("abort", abort);
        session.close();
        const headers = Object.entries(head).flatMap(([name, value]): [string, string][] =>
          name.startsWith(":") || value === undefined ? [] : [[name, String(value)]],
        );
        resolve(new Response(Buffer.concat(chunks), { status: Number(head[":status"]), headers }));
      });
    });
    stream.end();
  });
}

export const lookup: Lookup = createLookup(connect, "auto", fetchWithHttp2);
