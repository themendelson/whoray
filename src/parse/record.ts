import type { Name } from "#domain.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

export function toRecord(name: Name, found: Found): DomainRecord {
  const registry = registryOf(name.tld)?.id;
  const empty = (state: DomainState): DomainRecord => ({
    ...name,
    state,
    ...(registry !== undefined && { registry }),
    dates: {},
    statuses: [],
    nameservers: [],
  });
  if (found.kind === "available") return empty("available");
  if (found.kind === "reserved") return empty("reserved");
  if (found.kind === "error") return empty("unknown");
  const { created, updated, expires, released, statuses, nameservers, registrar, dnssec } = found;
  const statusSet = new Set(statuses);
  const state = stateOf(statusSet, expires);
  const drop = dropOf(name.tld, state, {
    statuses: statusSet,
    ...(expires && { expires }),
    ...(updated && { updated }),
    ...(released && { released }),
  });
  return {
    ...name,
    state,
    ...(registrar && { registrar }),
    ...(registry !== undefined && { registry }),
    dates: { ...(created && { created }), ...(updated && { updated }), ...(expires && { expires }) },
    statuses,
    nameservers,
    ...(dnssec !== undefined && { dnssec }),
    ...(drop && { drop }),
  };
}
