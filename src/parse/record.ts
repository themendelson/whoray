import type { Name } from "#domain.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import type { Found } from "#parse/found.ts";
import type { DomainRecord, DomainState } from "#types.ts";

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
  } = found;
  const dropDate = dropOf(name.tld, state, { ...found, statuses }, operator);
  return {
    ...identity(name, state),
    ...(registrar && { registrar }),
    ...(registrant && { registrant }),
    ...(admin && { admin }),
    ...(tech && { tech }),
    ...(billing && { billing }),
    ...(registry && { registry }),
    ...(handle !== undefined && { handle }),
    ...(creationDate && { creationDate }),
    ...(updatedDate && { updatedDate }),
    ...(expirationDate && { expirationDate }),
    ...(snapshotDate && { snapshotDate }),
    ...(dropDate && { dropDate }),
    statuses: found.statuses,
    nameservers: found.nameservers,
    ...(found.dnssec !== undefined && { dnssec: found.dnssec }),
  };
}

function identity(
  name: Name,
  state: DomainState,
): Pick<DomainRecord, "domain" | "unicode" | "tld" | "state" | "isAvailable"> {
  return {
    domain: name.domain,
    ...(name.unicode !== name.domain && { unicode: name.unicode }),
    tld: name.tld,
    state,
    ...(state !== "unknown" && { isAvailable: state === "available" }),
  };
}
