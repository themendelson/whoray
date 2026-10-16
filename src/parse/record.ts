import type { Name } from "#domain.ts";
import { dropOf, stateOf } from "#lifecycle.ts";
import type { Found } from "#parse/found.ts";
import { registryOf } from "#tlds.ts";
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
    const { kind: _, ...error } = found;
    return { ...empty("unknown"), error };
  }
  const statuses = new Set(found.statuses);
  const state = stateOf(statuses, found.expirationDate);
  const { registrar, registrant, handle, creationDate, updatedDate, expirationDate, snapshotDate, dnssec } = found;
  return {
    ...identity(name, state),
    ...(registrar && { registrar }),
    ...(registrant && { registrant }),
    ...(registry && { registry }),
    ...(handle !== undefined && { handle }),
    ...(creationDate && { creationDate }),
    ...(updatedDate && { updatedDate }),
    ...(expirationDate && { expirationDate }),
    ...(snapshotDate && { snapshotDate }),
    ...dropOf(name.tld, state, { ...found, statuses }, operator),
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
