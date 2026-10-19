import type { Name } from "#domain.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

export function toRecord(name: Name, found: Found): DomainRecord {
  const operator = registryOf(name.tld, found.kind === "record" ? found.registryId : undefined);
  const registry = operator && { id: operator.id, name: operator.name };
  const empty = (state: DomainState): DomainRecord => ({
    ...identity(name, state),
    registry,
    statuses: [],
    nameservers: [],
  });
  if (found.kind === "available") return { ...empty("available"), premium: found.premium };
  if (found.kind === "dropzone") return empty("dropzone");
  if (found.kind === "reserved") return empty("reserved");
  if (found.kind === "error") {
    const { kind: _, ...error } = found;
    return { ...empty("unknown"), error };
  }
  const statuses = new Set(found.statuses);
  const state = stateOf(statuses, found.expirationDate, found.registrar);
  const {
    registrar,
    registrant,
    admin,
    tech,
    billing,
    handle,
    creationDate,
    updatedDate,
    expirationDate,
    snapshotDate,
    nameservers,
    dnssec,
  } = found;
  const dropDate = dropOf(name.tld, state, { ...found, statuses }, operator);
  return {
    ...identity(name, state),
    registrar,
    registrant,
    admin,
    tech,
    billing,
    registry,
    handle,
    creationDate,
    updatedDate,
    expirationDate,
    snapshotDate,
    dropDate,
    statuses: found.statuses,
    nameservers,
    dnssec,
  };
}

function identity(
  name: Name,
  state: DomainState,
): Pick<DomainRecord, "domain" | "unicode" | "tld" | "state" | "isAvailable"> {
  return {
    domain: name.domain,
    unicode: name.unicode !== name.domain ? name.unicode : undefined,
    tld: name.tld,
    state,
    isAvailable: state !== "unknown" ? state === "available" : undefined,
  };
}
