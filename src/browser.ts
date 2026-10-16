import type { Lookup } from "#lookup.ts";
import { createLookup } from "#lookup.ts";
import { connect } from "#socket/browser.ts";

export * from "#core.ts";

export const lookup: Lookup = createLookup(connect, "rdap");
