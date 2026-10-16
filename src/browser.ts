import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import { connect } from "#socket/browser.ts";

export { parseRdap, parseWhois } from "#core.ts";
export type { Lookup } from "#lookup.ts";
export type * from "#types.ts";

export const lookup: Lookup = createLookup(connect);
