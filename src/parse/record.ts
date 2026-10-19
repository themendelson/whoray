import type { Name } from "#domain.ts";
import { dropOf, registryOf, stateOf } from "#lifecycle.ts";
import { defined } from "#parse/fields.ts";
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
  if (found.kind === "dropzone" || found.kind === "reserved") return empty(found.kind);
  if (found.kind === "error") {
    const { kind: _, ...error } = found;
    return { ...empty("unknown"), error };
  }
  const statuses = new Set(found.statuses);
  const state = stateOf(statuses, found.expirationDate, found.registrar);
  return {
    ...identity(name, state),
    ...defined({
      registrar: found.registrar,
      registrant: found.registrant,
      admin: found.admin,
      tech: found.tech,
      billing: found.billing,
      registry,
      handle: found.handle,
      creationDate: found.creationDate,
      updatedDate: found.updatedDate,
      expirationDate: found.expirationDate,
      snapshotDate: found.snapshotDate,
      dropDate: dropOf(name.tld, state, { ...found, statuses }, operator),
    }),
    statuses: found.statuses,
    nameservers: found.nameservers,
    ...defined({ dnssec: found.dnssec }),
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
