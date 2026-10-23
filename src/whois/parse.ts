import type { ContactPart, ContactRole, Field } from "#data/aliases.ts";
import { aliases } from "#data/aliases.ts";
import { dnssec, firstLine, notFound, notices, reserved, revoked } from "#data/phrases.ts";
import { quirks } from "#data/quirks.ts";
import type { Name } from "#domain.ts";
import { bySuffix } from "#domain.ts";
import { registryInText } from "#lifecycle.ts";
import { parseDate } from "#parse/dates.ts";
import type { Details } from "#parse/fields.ts";
import { contact, countryCode, defined, email, filled, hostnames, phone, registrar, visible } from "#parse/fields.ts";
import type { Found } from "#parse/found.ts";
import { normalizeStatuses } from "#parse/statuses.ts";
import type { Address, Contact, ErrorCode, Registrar } from "#types.ts";
import { pairs } from "#whois/pairs.ts";

const fieldByKey = new Map(aliases.flatMap(([field, keys]) => keys.map((key) => [key, field] as const)));

export function readWhois(text: string, name: Name): Found {
  const transforms = bySuffix(quirks, name.tld) ?? [];
  const transformed = transforms.reduce((current, transform) => transform(current), text);
  const fields = collect(transformed);
  const creationDate = firstOf(fields.get("created"), parseDate);
  const expirationDate = firstOf(fields.get("expires"), parseDate);
  const registrar = registrarOf(fields);
  const nameservers = hostnames(fields.get("nameservers") ?? []).filter((host) => host !== name.domain);
  const statuses = statusesOf(fields, transformed);
  const registered =
    creationDate !== undefined || expirationDate !== undefined || nameservers.length > 0 || statuses.length > 0;
  if (!registered && (!registrar || notFound.some((phrase) => phrase.test(text)))) return withoutRecord(text);
  return {
    kind: "record",
    statuses,
    nameservers,
    ...defined({
      registrar,
      creationDate,
      expirationDate,
      registrant: contactOf(fields, "registrant"),
      admin: contactOf(fields, "admin"),
      tech: contactOf(fields, "tech"),
      billing: contactOf(fields, "billing"),
      handle: visible(fields.get("handle")?.[0]),
      updatedDate: firstOf(fields.get("updated"), parseDate),
      released: firstOf(fields.get("released"), parseDate),
      deleted: firstOf(fields.get("deleted"), parseDate),
      snapshotDate: parseDate(/>>> Last update of WHOIS database:\s*(\S+)/i.exec(transformed)?.[1] ?? ""),
      dnssec: firstOf(fields.get("dnssec"), dnssecOf),
      registrarWhois: hostnames(fields.get("registrarWhois") ?? []).at(0),
      registryId: registryInText(transformed)?.id,
    }),
  };
}

function statusesOf(fields: Map<Field, string[]>, text: string): string[] {
  const statuses = normalizeStatuses(fields.get("statuses") ?? []);
  const deleting = revoked.some((phrase) => phrase.test(text));
  return deleting && !statuses.includes("pendingDelete") ? [...statuses, "pendingDelete"] : statuses;
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
  const failed = (code: ErrorCode, message: string): Found => ({ kind: "error", code, message });
  if (firstLine.dropzone.test(first)) return { kind: "dropzone" };
  if (firstLine.dpml.test(first) || said(reserved)) return { kind: "reserved" };
  if (said(notFound)) return { kind: "available", ...(firstLine.premium.test(first) && { premium: true }) };
  if (said(notices.rateLimited, notice)) return failed("rate_limited", "The server is rate limiting queries");
  if (said(notices.blocked, notice)) return failed("blocked", "The server refused this client");
  if (said(notices.retired, notice)) return failed("no_server", "The server no longer answers for this TLD");
  return failed("unparseable", "No registration data or known not-found reply");
}

// A throttling, refusal or retirement notice is the first line after the server's comment header;
// the same words further down are terms of use.
function noticeOf(lines: string[]): string {
  return lines.find((line) => /^\s*[%#]+\s*error\b/i.test(line) || !/^\s*[%#]/.test(line)) ?? "";
}

function firstOf<T>(values: string[] | undefined, read: (value: string) => T | undefined): T | undefined {
  for (const value of values ?? []) {
    const result = read(value);
    if (result !== undefined) return result;
  }
  return undefined;
}

const CONTACT_HANDLE = /^(?=\S*\d)[a-z0-9-]{5,}$/i;

function addressOf(fields: Map<Field, string[]>, role: ContactRole): Details<Address> {
  const values = (part: ContactPart): string[] => fields.get(`${role}${part}`) ?? [];
  return {
    street: values("Street").flatMap((line) => filled(line) ?? []),
    city: firstOf(values("City"), filled),
    state: firstOf(values("State"), filled),
    postalCode: firstOf(values("PostalCode"), filled),
    country: countryCode(firstOf(values("Country"), visible)),
    email: firstOf(values("Email"), email),
    phone: firstOf(values("Phone"), phone),
    fax: firstOf(values("Fax"), phone),
  };
}

function contactOf(fields: Map<Field, string[]>, role: ContactRole): Contact | undefined {
  return contact({
    name: visible(fields.get(`${role}Name`)?.find((value) => !CONTACT_HANDLE.test(value.trim()))),
    organization: firstOf(fields.get(`${role}Organization`), visible),
    ...addressOf(fields, role),
  });
}

function registrarOf(fields: Map<Field, string[]>): Registrar | undefined {
  const raw = firstOf(fields.get("registrar"), visible);
  if (raw === undefined) return undefined;
  const inline = /^(.*?)\s*\(\s*(https?:\/\/[^\s)]+)\s*\)$/.exec(raw);
  return registrar(inline?.[1] ?? raw, {
    ianaId: Number(fields.get("registrarIanaId")?.[0]),
    url: firstOf(fields.get("registrarUrl"), visible) ?? inline?.[2],
    ...addressOf(fields, "registrar"),
    abuseEmail: firstOf(fields.get("abuseEmail"), visible),
    abusePhone: firstOf(fields.get("abusePhone"), visible),
    whoisServer: hostnames(fields.get("registrarWhois") ?? []).at(0),
  });
}

function dnssecOf(value: string): boolean | undefined {
  if (dnssec.unsigned.test(value)) return false;
  return dnssec.signed.test(value) ? true : undefined;
}
