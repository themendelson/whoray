import type { JsonObject } from "#json.ts";
import { boolean, object, objects, string, strings } from "#json.ts";
import { parseDate } from "#parse/dates.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import { countryCode, registrant, visible } from "#parse/visible.ts";
import type { Registrant, Registrar } from "#types.ts";

const EVENT_FIELDS: Record<string, "created" | "updated" | "expires"> = {
  registration: "created",
  expiration: "expires",
  "last changed": "updated",
};

export function readRdap(json: unknown): Found {
  const root = object(json);
  if (!root) return { kind: "error", code: "unparseable", message: "RDAP reply is not a JSON object" };
  if (root.errorCode === 404) return { kind: "available" };
  if (string(root.objectClassName) !== "domain") {
    return { kind: "error", code: "unparseable", message: "RDAP reply is not a domain object" };
  }
  const dates: { created?: Date; updated?: Date; expires?: Date } = {};
  for (const event of objects(root.events)) {
    const field = EVENT_FIELDS[string(event.eventAction)?.toLowerCase() ?? ""];
    const date = parseDate(string(event.eventDate) ?? "");
    if (field && date) dates[field] ??= date;
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
    nameservers: [
      ...new Set(objects(root.nameservers).flatMap((ns) => string(ns.ldhName)?.toLowerCase().replace(/\.$/, "") ?? [])),
    ],
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
  const ianaId = Number(
    objects(entity.publicIds).find((id) => /iana/i.test(string(id.type) ?? ""))?.identifier ?? Number.NaN,
  );
  const abuse = objects(entity.entities).find((nested) => strings(nested.roles).includes("abuse"));
  const abuseEmail = abuse && vcard(abuse, "email")?.toLowerCase();
  const abusePhone = abuse && vcard(abuse, "tel")?.replace(/^tel:/, "");
  const url = vcard(entity, "url") ?? objects(entity.links).find((link) => string(link.rel) === "about")?.href;
  return {
    name,
    ...(Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(typeof url === "string" && { url }),
    ...(abuseEmail !== undefined && { abuseEmail }),
    ...(abusePhone !== undefined && { abusePhone }),
  };
}

function registrantOf(entity: JsonObject | undefined): Registrant | undefined {
  if (!entity) return undefined;
  const address = vcardEntry(entity, "adr");
  return registrant(
    visible(vcard(entity, "fn")),
    visible(vcard(entity, "org")),
    countryCode(string(object(address?.[1])?.cc) ?? strings(address?.[3]).at(-1)),
  );
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
