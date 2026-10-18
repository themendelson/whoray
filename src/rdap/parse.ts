import type { JsonObject } from "#json.ts";
import { boolean, object, objects, string, strings } from "#json.ts";
import { parseDate } from "#parse/dates.ts";
import { countryCode, email, filled, hostnames, phone, registrant, registrar, visible } from "#parse/fields.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Registrant, Registrar } from "#types.ts";

type EventField = "creationDate" | "updatedDate" | "expirationDate" | "deleted" | "snapshotDate";

const EVENT_FIELDS: Record<string, EventField> = {
  registration: "creationDate",
  registered: "creationDate",
  expiration: "expirationDate",
  expired: "expirationDate",
  "last changed": "updatedDate",
  transfer: "updatedDate",
  deleted: "deleted",
  deletion: "deleted",
  "last update of rdap database": "snapshotDate",
};

const ADR_PARTS = 7;

export function readRdap(json: unknown): Found {
  const root = object(json);
  if (!root) return { kind: "error", code: "unparseable", message: "RDAP reply is not a JSON object" };
  if (root.errorCode === 404) return { kind: "available" };
  if (string(root.objectClassName) !== "domain") {
    return { kind: "error", code: "unparseable", message: "RDAP reply is not a domain object" };
  }
  const dates: Partial<Record<EventField, Date>> = {};
  for (const event of objects(root.events)) {
    const field = EVENT_FIELDS[string(event.eventAction)?.toLowerCase() ?? ""];
    const date = parseDate(string(event.eventDate) ?? "");
    const current = field && dates[field];
    if (field && date && (!current || date > current)) dates[field] = date;
  }
  const withRole = (role: string): JsonObject | undefined =>
    objects(root.entities).find((entity) => strings(entity.roles).includes(role));
  const registrar = registrarOf(withRole("registrar"));
  const holder = registrantOf(withRole("registrant"));
  const handle = visible(string(root.handle));
  const dnssec = boolean(object(root.secureDNS)?.delegationSigned);
  const registrarRdap = relatedRdap(root);
  return {
    kind: "record",
    ...dates,
    statuses: normalizeStatuses(strings(root.status)),
    nameservers: hostnames(objects(root.nameservers ?? root.nameServers).flatMap((ns) => string(ns.ldhName) ?? [])),
    ...(registrar && { registrar }),
    ...(holder && { registrant: holder }),
    ...(handle !== undefined && { handle }),
    ...(dnssec !== undefined && { dnssec }),
    ...(registrarRdap !== undefined && { registrarRdap }),
  };
}

function registrarOf(entity: JsonObject | undefined): Registrar | undefined {
  const name = entity && (vcard(entity, "fn") ?? vcard(entity, "org"));
  if (!entity || name === undefined) return undefined;
  const ianaId = objects(entity.publicIds).find((id) => /iana/i.test(string(id.type) ?? ""))?.identifier;
  const abuse = objects(entity.entities).find((nested) => strings(nested.roles).includes("abuse"));
  const about = objects(entity.links).find((link) => string(link.rel) === "about");
  return registrar(name, {
    ianaId: Number(ianaId ?? Number.NaN),
    url: vcard(entity, "url") ?? string(about?.href),
    abuseEmail: abuse && vcard(abuse, "email"),
    abusePhone: abuse && vcard(abuse, "tel"),
  });
}

function registrantOf(entity: JsonObject | undefined): Registrant | undefined {
  if (!entity) return undefined;
  const address = vcardEntry(entity, "adr");
  const parts: unknown[] = Array.isArray(address?.[3]) && address[3].length === ADR_PARTS ? address[3] : [];
  return registrant({
    name: visible(vcard(entity, "fn")),
    organization: visible(vcard(entity, "org")),
    street: (Array.isArray(parts[2]) ? strings(parts[2]) : [string(parts[2]) ?? []].flat()).flatMap(
      (line) => filled(line) ?? [],
    ),
    city: filled(string(parts[3])),
    state: filled(string(parts[4])),
    postalCode: filled(string(parts[5])),
    country: countryCode(string(object(address?.[1])?.cc) ?? countryOf(address?.[3])),
    email: email(vcard(entity, "email")),
    phone: phone(vcard(entity, "tel")),
  });
}

function countryOf(parts: unknown): string | undefined {
  return Array.isArray(parts) && parts.length === ADR_PARTS ? string(parts[ADR_PARTS - 1]) : undefined;
}

function vcardEntry(entity: JsonObject, property: string): unknown[] | undefined {
  const card = entity.vcardArray;
  if (!Array.isArray(card) || !Array.isArray(card[1])) return undefined;
  const entries: unknown[] = card[1];
  for (const entry of entries) {
    if (!Array.isArray(entry)) continue;
    const fields: unknown[] = entry;
    if (fields[0] === property) return fields;
  }
  return undefined;
}

function vcard(entity: JsonObject, property: string): string | undefined {
  return string(vcardEntry(entity, property)?.[3]);
}

function relatedRdap(root: JsonObject): string | undefined {
  const self = objects(root.links).find((link) => string(link.rel) === "self")?.href;
  return objects(root.links)
    .filter((link) => string(link.rel) === "related" && /rdap\+json/i.test(string(link.type) ?? ""))
    .flatMap((link) => string(link.href) ?? [])
    .find((href) => href !== self && /\/domain\//i.test(href));
}
