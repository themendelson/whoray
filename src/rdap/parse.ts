import type { JsonObject } from "#json.ts";
import { boolean, object, objects, string, strings } from "#json.ts";
import { parseDate } from "#parse/dates.ts";
import type { Details } from "#parse/fields.ts";
import { contact, contacts, countryCode, email, filled, hostnames, phone, registrar, visible } from "#parse/fields.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Address, Contact, Registrar } from "#types.ts";

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
  const handle = visible(string(root.handle));
  const dnssec = boolean(object(root.secureDNS)?.delegationSigned);
  const registrarRdap = relatedRdap(root);
  return {
    kind: "record",
    ...dates,
    statuses: normalizeStatuses(strings(root.status)),
    nameservers: hostnames(objects(root.nameservers ?? root.nameServers).flatMap((ns) => string(ns.ldhName) ?? [])),
    ...(registrar && { registrar }),
    ...contacts({
      registrant: contactOf(withRole("registrant")),
      admin: contactOf(withRole("administrative")),
      tech: contactOf(withRole("technical")),
      billing: contactOf(withRole("billing")),
    }),
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
    ...addressOf(entity),
    abuseEmail: abuse && vcard(abuse, "email"),
    abusePhone: abuse && vcard(abuse, "tel"),
  });
}

function addressOf(entity: JsonObject): Details<Address> {
  const address = vcardEntry(entity, "adr");
  const parts: unknown[] = Array.isArray(address?.[3]) && address[3].length === ADR_PARTS ? address[3] : [];
  return {
    street: (Array.isArray(parts[2]) ? strings(parts[2]) : [string(parts[2]) ?? []].flat()).flatMap(
      (line) => filled(line) ?? [],
    ),
    city: filled(string(parts[3])),
    state: filled(string(parts[4])),
    postalCode: filled(string(parts[5])),
    country: countryCode(string(object(address?.[1])?.cc) ?? countryOf(address?.[3])),
    email: email(vcard(entity, "email")),
    phone: phone(tel(entity, false)),
    fax: phone(tel(entity, true)),
  };
}

function contactOf(entity: JsonObject | undefined): Contact | undefined {
  if (!entity) return undefined;
  return contact({
    name: visible(vcard(entity, "fn")),
    organization: visible(vcard(entity, "org")),
    ...addressOf(entity),
  });
}

function tel(entity: JsonObject, fax: boolean): string | undefined {
  const entries = vcardEntries(entity, "tel");
  const match = entries.find((entry) => {
    const type = object(entry[1])?.type;
    const types = Array.isArray(type) ? strings(type) : [string(type) ?? ""];
    return types.some((value) => value.toLowerCase() === "fax") === fax;
  });
  return string(match?.[3]);
}

function countryOf(parts: unknown): string | undefined {
  return Array.isArray(parts) && parts.length === ADR_PARTS ? string(parts[ADR_PARTS - 1]) : undefined;
}

function vcardEntries(entity: JsonObject, property: string): unknown[][] {
  const card = entity.vcardArray;
  if (!Array.isArray(card) || !Array.isArray(card[1])) return [];
  const entries: unknown[] = card[1];
  return entries.flatMap((entry): unknown[][] => {
    if (!Array.isArray(entry)) return [];
    const fields: unknown[] = entry;
    return fields[0] === property ? [fields] : [];
  });
}

function vcardEntry(entity: JsonObject, property: string): unknown[] | undefined {
  return vcardEntries(entity, property)[0];
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
