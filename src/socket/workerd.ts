import { connect as cloudflareConnect } from "cloudflare:sockets";
import type { Connect } from "#types.ts";

export const connect: Connect = async (hostname, port) => {
  const socket = cloudflareConnect({ hostname, port });
  await socket.opened;
  return socket;
};
