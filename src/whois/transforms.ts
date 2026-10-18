export type Transform = (text: string) => string;

export const registeredOnDate: Transform = (text) =>
  text.replace(/^\s*Registered on (.+?) at ([\d:]+)/m, "Created: $1 $2");

export const latestChange: Transform = (text) => {
  const stamps = [...text.matchAll(/^changed:.*?\b(\d{8})\b/gm)].map((match) => match[1] ?? "");
  const latest = stamps.sort().at(-1);
  return latest === undefined ? text : `Updated: ${latest}\n${text}`;
};

export const recordOnDates: Transform = (text) => text.replace(/^\s*Record (expires|created) on /gm, "\n$1: ");

export const commentedSections: Transform = (text) =>
  text
    .replace(/^%[ \t]*([\p{L} ]+):[ \t]*\n%[ \t]*=+[ \t]*$/gmu, "\n$1:")
    .replace(/^(Registrar:\n)registrar:/m, "$1handle:");

export const domainEppStatuses: Transform = (text) => {
  const block = /^domain:[\s\S]*?(?=\n[ \t]*\n)/m.exec(text)?.[0];
  return block === undefined ? text : text.replace(block, block.replace(/^eppstatus:/gm, "epp status:"));
};

const ENTITIES: Record<string, string> = { amp: "&", gt: ">", lt: "<", quot: '"', apos: "'" };

export const htmlEntities: Transform = (text) =>
  text.replace(/&(amp|gt|lt|quot|apos);/g, (entity, name: string) => ENTITIES[name] ?? entity);

export const emptyDottedFields: Transform = (text) => text.replace(/^[\p{L}][\p{L}\d ]*\.{2,}:[ \t]*\r?\n/gmu, "");

type HandleField = { key: string; value: string };

function contactBlock(text: string, handleKey: string, blockKey: string): HandleField[] {
  const handle = new RegExp(`^${handleKey}:[ \\t]+(\\S+)\\s*$`, "m").exec(text)?.[1];
  if (handle === undefined) return [];
  const header = new RegExp(`^${blockKey}:[ \\t]+${handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
  const block = text.split(/\r?\n[ \t]*\r?\n/).find((paragraph) => header.test(paragraph));
  return (block ?? "").split(/\r?\n/).flatMap((line) => {
    const match = /^([\w -]+?):[ \t]*(.*?)\s*$/.exec(line);
    return match?.[1] === undefined ? [] : [{ key: match[1].toLowerCase(), value: match[2] ?? "" }];
  });
}

function contactLines(fields: HandleField[], parts: Record<string, string>, label: string): string[] {
  const addresses = fields.filter(({ key }) => key === "address").map(({ value }) => value);
  const country = /^[A-Z]{2}$/.test(addresses.at(-1) ?? "") ? addresses.pop() : undefined;
  return [
    ...fields.flatMap(({ key, value }) => {
      const part = parts[key];
      return part === undefined || value === "" ? [] : [`${label} ${part}: ${value}`];
    }),
    ...addresses.map((line) => `${label} Street: ${line}`),
    ...(country === undefined ? [] : [`${label} Country: ${country}`]),
  ];
}

function handleContacts(
  handles: [string, string][],
  blockKey: string,
  parts: (fields: HandleField[]) => Record<string, string>,
): Transform {
  return (text) => {
    const lines = handles.flatMap(([handleKey, label]) => {
      const fields = contactBlock(text, handleKey, blockKey);
      return contactLines(fields, parts(fields), label);
    });
    return lines.length === 0 ? text : `${lines.join("\n")}\n\n${text}`;
  };
}

const CONTACT_HANDLES: [string, string][] = [
  ["admin-c", "Admin"],
  ["tech-c", "Tech"],
];

const FRED_CONTACT_KEYS: Record<string, string> = {
  org: "Organization",
  name: "Name",
  "e-mail": "Email",
  phone: "Phone",
  "fax-no": "Fax",
};

export const linkedRegistrant: Transform = handleContacts(
  [["registrant", "Registrant"], ...CONTACT_HANDLES],
  "contact",
  () => FRED_CONTACT_KEYS,
);

export const afnicHolder: Transform = handleContacts(
  [["holder-c", "Registrant"], ...CONTACT_HANDLES],
  "nic-hdl",
  (fields) => ({
    contact: fields.some(({ key, value }) => key === "type" && value === "ORGANIZATION") ? "Organization" : "Name",
    country: "Country",
    "e-mail": "Email",
    phone: "Phone",
    "fax-no": "Fax",
  }),
);

const RIPE_CONTACT_KEYS: Record<string, string> = {
  person: "Name",
  personname: "Name",
  role: "Name",
  organization: "Organization",
  org: "Organization",
  "street address": "Street",
  "postal code": "Postal Code",
  city: "City",
  "state or province": "State/Province",
  country: "Country",
  phone: "Phone",
  "fax-no": "Fax",
  "e-mail": "Email",
};

export const nicHandleRegistrant: Transform = handleContacts(
  [["registrant", "Registrant"], ...CONTACT_HANDLES, ["billing-c", "Billing"]],
  "nic-hdl",
  () => RIPE_CONTACT_KEYS,
);

export const handleParagraphs: Transform = (text) =>
  text
    .replace(/^Domain registrant:.*(?:\r?\n(?![ \t]*\r?$).*)*/m, (paragraph) =>
      paragraph.replace(/^(?!Domain registrant:)([^:\r\n]+:)/gm, "Registrant $1"),
    )
    .replace(/^Registrar:.*\r?\n((?:(?![ \t]*\r?$).*(?:\r?\n|$))*)/m, (_, paragraph: string) =>
      paragraph.replace(/^([^:\r\n]+:)/gm, "Registrar $1"),
    );

export const registrantEmail: Transform = (text) =>
  text.replace(/^(registrant:.*\r?\n)e-mail:/m, "$1registrant e-mail:");
