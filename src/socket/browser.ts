import type { Connect } from "#types.ts";

export const connect: Connect = () =>
  Promise.reject(new Error('Port 43 isn\'t reachable from a browser; use rdap: "only" or pass a connect hook.'));
