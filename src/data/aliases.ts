export type Field =
  | "registrar"
  | "registrarUrl"
  | "registrarIanaId"
  | "registrarWhois"
  | "abuseEmail"
  | "abusePhone"
  | "registrantName"
  | "registrantOrganization"
  | "registrantCountry"
  | "handle"
  | "created"
  | "updated"
  | "expires"
  | "released"
  | "deleted"
  | "statuses"
  | "nameservers"
  | "dnssec";

export const aliases: [Field, string[]][] = [
  ["registrantName", ["registrant name", "registrant contact name", "registrant"]],
  [
    "registrantOrganization",
    ["registrant organization", "registrant organisation", "registrant org", "domain holder organization"],
  ],
  ["registrantCountry", ["registrant country", "registrant country code", "domain holder country"]],
  ["handle", ["registry domain id", "roid"]],
  [
    "registrar",
    [
      "registrar",
      "sponsoring registrar",
      "registrar name",
      "registrar organization",
      "registrar organisation",
      "registrar registrar name",
      "registrar organization name",
      "registration service provider",
      "authorized agency",
    ],
  ],
  [
    "registrarUrl",
    [
      "registrar url",
      "registrar website",
      "registrar info",
      "registrar web",
      "referral url",
      "registration service url",
    ],
  ],
  ["registrarIanaId", ["registrar iana id", "sponsoring registrar iana id"]],
  ["registrarWhois", ["registrar whois server", "whois server", "registrar whois"]],
  ["abuseEmail", ["registrar abuse contact email"]],
  ["abusePhone", ["registrar abuse contact phone"]],
  [
    "created",
    [
      "creation date",
      "created",
      "created on",
      "created date",
      "registered",
      "registered on",
      "registration date",
      "registration time",
      "domain registration date",
      "domain record activated",
      "domain name commencement date",
      "assigned",
      "record created",
      "registered date",
    ],
  ],
  [
    "updated",
    [
      "updated date",
      "last updated",
      "last update",
      "last modified",
      "last updated on",
      "modified",
      "changed",
      "updated",
      "last-update",
      "domain record last updated",
      "last updated date",
      "modification date",
    ],
  ],
  [
    "expires",
    [
      "registry expiry date",
      "registry expiration date",
      "registrar registration expiration date",
      "expiry date",
      "expiration date",
      "expiration time",
      "expires",
      "expires on",
      "expire",
      "expire date",
      "paid-till",
      "validity",
      "valid until",
      "renewal date",
      "record expires on",
      "exp date",
    ],
  ],
  ["released", ["free-date", "available", "reservation eligibility end date"]],
  ["deleted", ["deleted"]],
  [
    "statuses",
    ["domain status", "status", "state", "domain state", "registration status", "flags", "lock status", "epp status"],
  ],
  [
    "nameservers",
    [
      "name server",
      "name servers",
      "nameserver",
      "nameservers",
      "nserver",
      "hostname",
      "host name",
      "dns",
      "name server information",
      "name servers information",
      "name servers dns",
      "domain nameservers",
      "domain servers",
      "domain servers in listed order",
    ],
  ],
  ["dnssec", ["dnssec", "signed", "dnssec status", "dnssec signed"]],
];
