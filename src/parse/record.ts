import type { Name } from "#domain.ts";
import type { Facts } from "#drop.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found, Registration } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

export function toRecord(name: Name, found: Found): DomainRecord {
  const operator = registryOf(name.tld, found.kind === "record" ? found.registryId : undefined);
  const registry = operator && { id: operator.id, name: operator.name };
  const empty = (state: DomainState): DomainRecord => ({
    ...name,
    state,
    ...(registry && { registry }),
    dates: {},
    statuses: [],
    nameservers: [],
  });
  if (found.kind === "available") return { ...empty("available"), ...(found.premium && { premium: true }) };
  if (found.kind === "dropzone") return empty("dropzone");
  if (found.kind === "reserved") return empty("reserved");
  if (found.kind === "error") return empty("unknown");
  const statuses = new Set(found.statuses);
  const state = stateOf(statuses, found.expires);
  const drop = dropOf(name.tld, state, factsOf(found, statuses), operator);
  const { registrar, registrant, handle, dnssec } = found;
  return {
    ...name,
    state,
    ...(registrar && { registrar }),
    ...(registrant && { registrant }),
    ...(registry && { registry }),
    ...(handle !== undefined && { handle }),
    dates: datesOf(found),
    statuses: found.statuses,
    nameservers: found.nameservers,
    ...(dnssec !== undefined && { dnssec }),
    ...(drop && { drop }),
  };
}

function factsOf({ expires, updated, released, deleted }: Registration, statuses: Set<string>): Facts {
  return {
    statuses,
    ...(expires && { expires }),
    ...(updated && { updated }),
    ...(released && { released }),
    ...(deleted && { deleted }),
  };
}

function datesOf({ created, updated, expires, database }: Registration): DomainRecord["dates"] {
  return {
    ...(created && { created }),
    ...(updated && { updated }),
    ...(expires && { expires }),
    ...(database && { database }),
  };
}
