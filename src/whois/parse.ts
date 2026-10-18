import type { ContactPart, ContactRole, Field } from "#data/aliases.ts";
import { aliases } from "#data/aliases.ts";
import { dnssec, firstLine, notFound, notices, reserved, revoked } from "#data/phrases.ts";
import { quirks } from "#data/quirks.ts";
import type { Name } from "#domain.ts";
import { bySuffix } from "#domain.ts";
import { registryInText } from "#lifecycle.ts";
import { parseDate } from "#parse/dates.ts";
import type { Details } from "#parse/fields.ts";
import { contact, contacts, countryCode, email, filled, hostnames, phone, registrar, visible } from "#parse/fields.ts";
import type { Found, Registration } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Address, Contact, Registrar } from "#types.ts";
import { pairs } from "#whois/pairs.ts";

const fieldByKey = new Map(aliases.flatMap(([field, keys]) => keys.map((key) => [key, field] as const)));

export function readWhois(text: string, name: Name): Found {
  const transforms = bySuffix(quirks, name.tld) ?? [];
  const fields = collect(transforms.reduce((current, transform) => transform(current), text));
  const creationDate = firstDate(fields.get("created"));
  const expirationDate = firstDate(fields.get("expires"));
  const registrar = registrarOf(fields);
  const nameservers = hostnames(fields.get("nameservers") ?? []).filter((host) => host !== name.domain);
  const statuses = statusesOf(fields, text);
  if (!creationDate && !expirationDate && !registrar && nameservers.length === 0 && statuses.length === 0) {
    return withoutRecord(text);
  }
  return {
    kind: "record",
    statuses,
    nameservers,
    ...(registrar && { registrar }),
    ...(creationDate && { creationDate }),
    ...(expirationDate && { expirationDate }),
    ...details(fields, text),
  };
}

function statusesOf(fields: Map<Field, string[]>, text: string): string[] {
  const statuses = normalizeStatuses(fields.get("statuses") ?? []);
  const deleting = revoked.some((phrase) => phrase.test(text));
  return deleting && !statuses.includes("pendingDelete") ? [...statuses, "pendingDelete"] : statuses;
}

function details(fields: Map<Field, string[]>, text: string): Partial<Registration> {
  const updatedDate = firstDate(fields.get("updated"));
  const released = firstDate(fields.get("released"));
  const deleted = firstDate(fields.get("deleted"));
  const snapshotDate = parseDate(/>>> Last update of WHOIS database:\s*(\S+)/i.exec(text)?.[1] ?? "");
  const registrarWhois = hostnames(fields.get("registrarWhois") ?? []).at(0);
  const dnssec = (fields.get("dnssec") ?? []).map(dnssecOf).find((value) => value !== undefined);
  const handle = visible(fields.get("handle")?.[0]);
  const registryId = registryInText(text)?.id;
  return {
    ...contacts({
      registrant: contactOf(fields, "registrant"),
      admin: contactOf(fields, "admin"),
      tech: contactOf(fields, "tech"),
      billing: contactOf(fields, "billing"),
    }),
    ...(handle !== undefined && { handle }),
    ...(updatedDate && { updatedDate }),
    ...(released && { released }),
    ...(deleted && { deleted }),
    ...(snapshotDate && { snapshotDate }),
    ...(dnssec !== undefined && { dnssec }),
    ...(registrarWhois !== undefined && { registrarWhois }),
    ...(registryId !== undefined && { registryId }),
  };
}

function collect(text: string): Map<Field, string[]> {
  const fields = new Map<Field, string[]>();
  for (const { key, value } of pairs(text)) {
    const field = fieldByKey.get(key);
    if (field) fields.set(field, [...(fields.get(field) ?? []), value]);
  }
  return fields;
}

function withoutRecord(text: string): Found {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  const first = lines[0] ?? "";
  const notice = noticeOf(lines);
  const said = (phrases: RegExp[], within = text): boolean => phrases.some((phrase) => phrase.test(within));
  if (firstLine.dropzone.test(first)) return { kind: "dropzone" };
  if (firstLine.dpml.test(first) || said(reserved)) return { kind: "reserved" };
  if (said(notFound)) return { kind: "available", ...(firstLine.premium.test(first) && { premium: true }) };
  if (said(notices.rateLimited, notice)) {
    return { kind: "error", code: "rate_limited", message: "The server is rate limiting queries" };
  }
  if (said(notices.blocked, notice))
    return { kind: "error", code: "blocked", message: "The server refused this client" };
  if (said(notices.retired, notice)) {
    return { kind: "error", code: "no_server", message: "The server no longer answers for this TLD" };
  }
  return { kind: "error", code: "unparseable", message: "No registration data or known not-found reply" };
}

// A throttling, refusal or retirement notice is the first line after the server's comment header;
// the same words further down are terms of use.
function noticeOf(lines: string[]): string {
  return lines.find((line) => /^\s*[%#]+\s*error\b/i.test(line) || !/^\s*[%#]/.test(line)) ?? "";
}

function firstDate(values: string[] | undefined): Date | undefined {
  for (const value of values ?? []) {
    const date = parseDate(value);
    if (date) return date;
  }
  return undefined;
}

function present(values: string[] | undefined): string | undefined {
  return values?.find((value) => visible(value) !== undefined);
}

const CONTACT_HANDLE = /^(?=\S*\d)[a-z0-9-]{5,}$/i;

function addressOf(fields: Map<Field, string[]>, role: ContactRole): Details<Address> {
  const values = (part: ContactPart): string[] => fields.get(`${role}${part}`) ?? [];
  const first = (part: ContactPart): string | undefined =>
    values(part)
      .flatMap((value) => filled(value) ?? [])
      .at(0);
  return {
    street: values("Street").flatMap((line) => filled(line) ?? []),
    city: first("City"),
    state: first("State"),
    postalCode: first("PostalCode"),
    country: countryCode(present(values("Country"))),
    email: values("Email")
      .flatMap((value) => email(value) ?? [])
      .at(0),
    phone: values("Phone")
      .flatMap((value) => phone(value) ?? [])
      .at(0),
    fax: values("Fax")
      .flatMap((value) => phone(value) ?? [])
      .at(0),
  };
}

function contactOf(fields: Map<Field, string[]>, role: ContactRole): Contact | undefined {
  return contact({
    name: visible(fields.get(`${role}Name`)?.find((value) => !CONTACT_HANDLE.test(value.trim()))),
    organization: present(fields.get(`${role}Organization`)),
    ...addressOf(fields, role),
  });
}

function registrarOf(fields: Map<Field, string[]>): Registrar | undefined {
  const raw = present(fields.get("registrar"));
  if (raw === undefined) return undefined;
  const inline = /^(.*?)\s*\(\s*(https?:\/\/[^\s)]+)\s*\)$/.exec(raw);
  const name = inline?.[1] ?? raw;
  return registrar(name, {
    ianaId: Number(fields.get("registrarIanaId")?.[0]),
    url: present(fields.get("registrarUrl")) ?? inline?.[2],
    ...addressOf(fields, "registrar"),
    abuseEmail: present(fields.get("abuseEmail")),
    abusePhone: present(fields.get("abusePhone")),
    whoisServer: hostnames(fields.get("registrarWhois") ?? []).at(0),
  });
}

function dnssecOf(value: string): boolean | undefined {
  if (dnssec.unsigned.test(value)) return false;
  if (dnssec.signed.test(value)) return true;
  return undefined;
}
