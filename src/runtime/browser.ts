import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import type { Connect } from "#types.ts";

export * from "#core.ts";

const connect: Connect = () =>
  Promise.reject(new Error('Port 43 isn\'t reachable from a browser; use protocol: "rdap" or pass a connect hook.'));

export const lookup: Lookup = createLookup(connect, "rdap");
