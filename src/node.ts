import type { Lookup } from "#lookup.ts";
import { lookupVia, whoisVia } from "#lookup.ts";
import { connect } from "#socket/node.ts";
import type { WhoisOptions } from "#types.ts";

export * from "#core.ts";

export const lookup: Lookup = (domain, options) => lookupVia(connect, domain, options);
export const whois: Lookup<WhoisOptions> = (domain, options) => whoisVia(connect, domain, options);
