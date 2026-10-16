import type { Name } from "#domain.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

export function toRecord(name: Name, found: Found): DomainRecord {
  const operator = registryOf(name.tld);
  const registry = operator && { id: operator.id, name: operator.name };
  const empty = (state: DomainState): DomainRecord => ({
    ...name,
    state,
    ...(registry && { registry }),
    dates: {},
    statuses: [],
    nameservers: [],
  });
  if (found.kind === "available") return empty("available");
  if (found.kind === "reserved") return empty("reserved");
  if (found.kind === "error") return empty("unknown");
  const { created, updated, expires, released, statuses, nameservers, registrar, registrant, handle, dnssec } = found;
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
    ...(registrant && { registrant }),
    ...(registry && { registry }),
    ...(handle !== undefined && { handle }),
    dates: { ...(created && { created }), ...(updated && { updated }), ...(expires && { expires }) },
    statuses,
    nameservers,
    ...(dnssec !== undefined && { dnssec }),
    ...(drop && { drop }),
  };
}
