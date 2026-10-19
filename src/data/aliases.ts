import { phrases } from "#data/lists.ts";

export type ContactRole = "registrant" | "admin" | "tech" | "billing" | "registrar";
export type ContactPart =
  | "Name"
  | "Organization"
  | "Street"
  | "City"
  | "State"
  | "PostalCode"
  | "Country"
  | "Email"
  | "Phone"
  | "Fax";

export type Field =
  | "registrar"
  | "registrarUrl"
  | "registrarIanaId"
  | "registrarWhois"
  | "abuseEmail"
  | "abusePhone"
  | `${ContactRole}${ContactPart}`
  | "handle"
  | "created"
  | "updated"
  | "expires"
  | "released"
  | "deleted"
  | "statuses"
  | "nameservers"
  | "dnssec";

const ROLE_PREFIXES: [ContactRole, string[]][] = [
  ["registrant", phrases("registrant, holder, owner, owner contact, titular")],
  [
    "admin",
    phrases(`
      admin, administrative, administrative contact, admin contact, admin_c, administrativ contact, ac,
      contacto administrativo
    `),
  ],
  ["tech", phrases("tech, technical, technical contact, tech contact, tech_c, technical contacts, contacto tecnico")],
  ["billing", phrases("billing, billing contact, billing_c, contacto financiero")],
  ["registrar", phrases("registrar, sponsoring registrar")],
];

const PART_SUFFIXES: [ContactPart, string[]][] = [
  ["Name", phrases("name, contact name, nom, nombre")],
  ["Organization", phrases("organization, organisation, org, organization name")],
  [
    "Street",
    phrases(`
      street, street1, street2, street3, address, address1, address2, address3, street address, adresse, direccion
    `),
  ],
  ["City", phrases("city, locality, ville, ciudad")],
  ["State", phrases("state/province, state / province, state, province")],
  ["PostalCode", phrases("postal code, postcode, zip code, zipcode, zip, code postal")],
  ["Country", phrases("country, country code, pays, pais")],
  ["Email", phrases("email, e-mail, courriel, email address")],
  ["Phone", phrases("phone, phone number, téléphone, telefono")],
  ["Fax", phrases("fax, fax number")],
];

const REGISTRAR_OWN_PARTS = new Set<ContactPart>(["Name", "Organization"]);

const contactAliases: [Field, string[]][] = ROLE_PREFIXES.flatMap(([role, prefixes]) =>
  PART_SUFFIXES.filter(([part]) => role !== "registrar" || !REGISTRAR_OWN_PARTS.has(part)).map(
    ([part, suffixes]): [Field, string[]] => [
      `${role}${part}`,
      prefixes.flatMap((prefix) => suffixes.flatMap((suffix) => [`${prefix} ${suffix}`, `${prefix}-${suffix}`])),
    ],
  ),
);

export const aliases: [Field, string[]][] = [
  ...contactAliases,
  ["registrantName", phrases("registrant, owner")],
  ["adminName", phrases("administrative contact(ac), administrative contact")],
  ["techName", ["technical contact"]],
  ["billingName", ["billing contact"]],
  ["registrantOrganization", phrases("registrant organization-loc, domain holder organization")],
  ["registrantCountry", phrases("registrant country-loc, domain holder country, org-country")],
  ["registrantPostalCode", ["holder postal"]],
  ["handle", phrases("registry domain id, roid")],
  [
    "registrar",
    phrases(`
      registrar, last registrar, sponsoring registrar, registrar name, registrar organization, registrar organisation,
      registrar registrar name, registrar organization name, current registrar, registrar-name,
      registration service provider, authorized agency
    `),
  ],
  [
    "registrarUrl",
    phrases(`
      registrar url, registrar website, registrar www, sponsoring registrar url, registrar-url, registrar info,
      registrar web, referral url, registration service url
    `),
  ],
  ["registrarIanaId", phrases("registrar iana id, sponsoring registrar iana id")],
  ["registrarWhois", phrases("registrar whois server, whois server, registrar whois")],
  ["abuseEmail", phrases("registrar abuse contact email, registrar abuse-email")],
  ["abusePhone", phrases("registrar abuse contact phone, registrar abuse-phone")],
  [
    "created",
    phrases(`
      creation date, created, domain created, created on, created date, registered, registered on, registration date,
      registration time, domain registration date, domain record activated, domain name commencement date, assigned,
      record created, registered date, date de création, fecha de registro
    `),
  ],
  [
    "updated",
    phrases(`
      updated date, last updated, last update, last modified, last updated on, record last updated on, modified,
      changed, updated, last-update, domain record last updated, last updated date, modification date,
      dernière modification
    `),
  ],
  [
    "expires",
    phrases(`
      registry expiry date, registry expiration date, registrar registration expiration date, expiry date,
      expiration date, expiration time, expires, expires on, expired on, expire, expire date, paid-till, validity,
      valid until, renewal date, record expires on, exp date, date d'expiration, fecha de vencimiento
    `),
  ],
  [
    "released",
    phrases(`
      free-date, available, reservation eligibility end date, date_to_release, date out of quarantine, purge date
    `),
  ],
  ["deleted", ["deleted"]],
  [
    "statuses",
    phrases(`
      domain status, status, state, domain state, registration status, flags, lock status, epp status,
      transfer status, domaintype, statut
    `),
  ],
  [
    "nameservers",
    phrases(`
      name server, name servers, nameserver, nameservers, nserver, hostname, host name, dns, name server information,
      name servers information, name servers dns, domain nameservers, domain servers, domain servers in listed order,
      dns servers, serveur de noms, dns servers name, name servers in the listed order
    `),
  ],
  ["dnssec", phrases("dnssec, signed, dnssec status, dnssec signed, technical contact dnssec")],
];
