import { createServer as createHttp2Server } from "node:http2";
import type { Server, Socket } from "node:net";
import { connect, createServer as createNetServer } from "node:net";
import { afterAll, beforeAll, expect, test } from "vitest";
import { lookup } from "#runtime/node.ts";

const HTTP2_PREFACE = "PRI * HTTP/2.0";
const UPGRADE_REQUIRED = "HTTP/1.1 426 Upgrade Required\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
const RECORD = JSON.stringify({
  objectClassName: "domain",
  ldhName: "example.tw",
  events: [{ eventAction: "registration", eventDate: "2005-10-27T00:00:00Z" }],
});

const sockets = new Set<Socket>();
const http2 = createHttp2Server((_request, response) =>
  response.writeHead(200, { "content-type": "application/rdap+json" }).end(RECORD),
);
const front = createNetServer((socket) => {
  sockets.add(socket);
  socket.once("data", (chunk) => {
    if (!chunk.toString().startsWith(HTTP2_PREFACE)) return void socket.end(UPGRADE_REQUIRED);
    const backend = connect(portOf(http2), "127.0.0.1", () => {
      backend.write(chunk);
      socket.pipe(backend).pipe(socket);
    });
    sockets.add(backend);
  });
});

function portOf(server: Server): number {
  const address = server.address();
  return typeof address === "object" && address !== null ? address.port : 0;
}

const listen = (server: Server): Promise<void> => new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

beforeAll(() => Promise.all([listen(http2), listen(front)]));
afterAll(() => {
  for (const socket of sockets) socket.destroy();
  http2.close();
  front.close();
});

test("an RDAP server that answers HTTP/1.1 with 426 is asked again over HTTP/2", async () => {
  const result = await lookup("example.tw", {
    protocol: "rdap",
    servers: { tw: { rdap: `http://127.0.0.1:${portOf(front)}/` } },
  });
  expect(result).toMatchObject({ state: "registered", creationDate: new Date("2005-10-27T00:00:00Z") });
});
