import type { Name } from "#domain.ts";
import type { Facts } from "#drop.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found, Registration } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

const REGISTERED: Record<DomainState, boolean | undefined> = {
  registered: true,
  expired: true,
  redemption: true,
  pendingDelete: true,
  available: false,
  dropzone: false,
  reserved: false,
  unknown: undefined,
};

export function toRecord(name: Name, found: Found): DomainRecord {
  const operator = registryOf(name.tld, found.kind === "record" ? found.registryId : undefined);
  const registry = operator && { id: operator.id, name: operator.name };
  const empty = (state: DomainState): DomainRecord => ({
    ...identity(name, state),
    ...(registry && { registry }),
    statuses: [],
    nameservers: [],
  });
  if (found.kind === "available") return { ...empty("available"), ...(found.premium && { premium: true }) };
  if (found.kind === "dropzone") return empty("dropzone");
  if (found.kind === "reserved") return empty("reserved");
  if (found.kind === "error") {
    const { code, message, server, retryAfter } = found;
    const error = {
      code,
      message,
      ...(server !== undefined && { server }),
      ...(retryAfter !== undefined && { retryAfter }),
    };
    return { ...empty("unknown"), error };
  }
  const statuses = new Set(found.statuses);
  const state = stateOf(statuses, found.expires);
  const drop = dropOf(name.tld, state, factsOf(found, statuses), operator);
  const { registrar, registrant, handle, dnssec } = found;
  return {
    ...identity(name, state),
    ...(registrar && { registrar }),
    ...(registrant && { registrant }),
    ...(registry && { registry }),
    ...(handle !== undefined && { handle }),
    ...datesOf(found),
    ...drop,
    statuses: found.statuses,
    nameservers: found.nameservers,
    ...(dnssec !== undefined && { dnssec }),
  };
}

function identity(
  name: Name,
  state: DomainState,
): Pick<DomainRecord, "domain" | "unicode" | "tld" | "state" | "isRegistered"> {
  const isRegistered = REGISTERED[state];
  return {
    domain: name.domain,
    ...(name.unicode !== name.domain && { unicode: name.unicode }),
    tld: name.tld,
    state,
    ...(isRegistered !== undefined && { isRegistered }),
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

function datesOf({ created, updated, expires, database }: Registration): Partial<DomainRecord> {
  return {
    ...(created && { creationDate: created }),
    ...(updated && { updatedDate: updated }),
    ...(expires && { expirationDate: expires }),
    ...(database && { snapshotDate: database }),
  };
}
