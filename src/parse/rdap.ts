import type { JsonObject } from "#json.ts";
import { boolean, object, objects, string, strings } from "#json.ts";
import { parseDate } from "#parse/dates.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Registrar } from "#types.ts";

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
  const registrar = registrarOf(objects(root.entities).find((entity) => strings(entity.roles).includes("registrar")));
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
  const url = vcard(entity, "url") ?? objects(entity.links).find((link) => string(link.rel) === "about")?.href;
  return {
    name,
    ...(Number.isInteger(ianaId) && ianaId > 0 && { ianaId }),
    ...(typeof url === "string" && { url }),
    ...(abuseEmail !== undefined && { abuseEmail }),
  };
}

function vcard(entity: JsonObject, property: string): string | undefined {
  const card = entity.vcardArray;
  if (!Array.isArray(card) || !Array.isArray(card[1])) return undefined;
  for (const entry of card[1]) {
    if (Array.isArray(entry) && entry[0] === property) return string(entry[3]);
  }
  return undefined;
}

function relatedRdap(root: JsonObject): string | undefined {
  const self = objects(root.links).find((link) => string(link.rel) === "self")?.href;
  return objects(root.links)
    .filter((link) => string(link.rel) === "related" && /rdap\+json/i.test(string(link.type) ?? ""))
    .flatMap((link) => string(link.href) ?? [])
    .find((href) => href !== self && /\/domain\//i.test(href));
}
