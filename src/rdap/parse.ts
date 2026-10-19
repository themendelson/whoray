import type { JsonObject } from "#json.ts";
import { boolean, object, objects, string, strings } from "#json.ts";
import { parseDate } from "#parse/dates.ts";
import type { Details } from "#parse/fields.ts";
import { contact, countryCode, defined, email, hostnames, phone, registrar, visible } from "#parse/fields.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Address, Contact, Registrar } from "#types.ts";

type EventField = "creationDate" | "updatedDate" | "expirationDate" | "released" | "deleted" | "snapshotDate";

const EVENT_FIELDS: Record<string, EventField> = {
  registration: "creationDate",
  registered: "creationDate",
  expiration: "expirationDate",
  expired: "expirationDate",
  "record expires": "expirationDate",
  "last changed": "updatedDate",
  "purge date": "released",
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
  return {
    kind: "record",
    ...dates,
    statuses: normalizeStatuses(strings(root.status)),
    nameservers: hostnames(objects(root.nameservers ?? root.nameServers).flatMap((ns) => string(ns.ldhName) ?? [])),
    ...defined({
      registrar: registrarOf(withRole("registrar")),
      registrant: contactOf(withRole("registrant")),
      admin: contactOf(withRole("administrative")),
      tech: contactOf(withRole("technical")),
      billing: contactOf(withRole("billing")),
      handle: visible(string(root.handle)),
      dnssec: boolean(object(root.secureDNS)?.delegationSigned),
      registrarRdap: relatedRdap(root),
    }),
  };
}

function registrarOf(entity: JsonObject | undefined): Registrar | undefined {
  const name = entity && (vcard(entity, "fn") ?? vcard(entity, "org"));
  if (!entity || name === undefined) return undefined;
  const abuse = objects(entity.entities).find((nested) => strings(nested.roles).includes("abuse"));
  const about = objects(entity.links).find((link) => string(link.rel) === "about");
  return registrar(name, {
    ianaId: Number(objects(entity.publicIds).find((id) => /iana/i.test(string(id.type) ?? ""))?.identifier),
    url: vcard(entity, "url") ?? string(about?.href),
    ...addressOf(entity),
    abuseEmail: abuse && vcard(abuse, "email"),
    abusePhone: abuse && vcard(abuse, "tel"),
  });
}

function addressOf(entity: JsonObject): Details<Address> {
  const address = vcardEntries(entity, "adr")[0];
  const parts: unknown[] = Array.isArray(address?.[3]) && address[3].length === ADR_PARTS ? address[3] : [];
  return {
    street: strings([parts[2]].flat()).flatMap((line) => visible(line) ?? []),
    city: visible(string(parts[3])),
    state: visible(string(parts[4])),
    postalCode: visible(string(parts[5])),
    country: countryCode(string(object(address?.[1])?.cc) ?? string(parts[ADR_PARTS - 1])),
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
  const isFax = (entry: unknown[]): boolean =>
    strings([object(entry[1])?.type].flat()).some((type) => type.toLowerCase() === "fax");
  return string(vcardEntries(entity, "tel").find((entry) => isFax(entry) === fax)?.[3]);
}

function vcardEntries(entity: JsonObject, property: string): unknown[][] {
  const card = entity.vcardArray;
  const entries: unknown[] = Array.isArray(card) && Array.isArray(card[1]) ? card[1] : [];
  return entries.flatMap((entry): unknown[][] => (Array.isArray(entry) && entry[0] === property ? [entry] : []));
}

function vcard(entity: JsonObject, property: string): string | undefined {
  return string(vcardEntries(entity, property)[0]?.[3]);
}

function relatedRdap(root: JsonObject): string | undefined {
  const self = objects(root.links).find((link) => string(link.rel) === "self")?.href;
  return objects(root.links)
    .filter((link) => string(link.rel) === "related" && /rdap\+json/i.test(string(link.type) ?? ""))
    .flatMap((link) => string(link.href) ?? [])
    .find((href) => href !== self && /\/domain\//i.test(href));
}
