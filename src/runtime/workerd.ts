import { connect as cloudflareConnect } from "cloudflare:sockets";
import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import type { Connect } from "#types.ts";

export * from "#core.ts";

const connect: Connect = async (hostname, port) => {
  const socket = cloudflareConnect({ hostname, port });
  await socket.opened;
  return socket;
};

export const lookup: Lookup = createLookup(connect);
