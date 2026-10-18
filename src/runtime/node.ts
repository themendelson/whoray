import { createConnection } from "node:net";
import { Duplex } from "node:stream";
import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import type { Connect } from "#types.ts";

export * from "#core.ts";

const connect: Connect = (host, port, signal) =>
  new Promise((resolve, reject) => {
    const socket = createConnection({ host, port, ...(signal && { signal }) });
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.off("error", reject);
      resolve(Duplex.toWeb(socket));
    });
  });

export const lookup: Lookup = createLookup(connect);
