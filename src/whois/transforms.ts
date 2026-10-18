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

function contactBlock(text: string, handleKey: string, blockKey: string): { key: string; value: string }[] {
  const handle = new RegExp(`^${handleKey}:[ \\t]+(\\S+)\\s*$`, "m").exec(text)?.[1];
  if (handle === undefined) return [];
  const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = `^${blockKey}:[ \\t]+${escaped}[ \\t]*\\r?\\n([\\s\\S]*?)(?:\\r?\\n[ \\t]*\\r?\\n|(?![\\s\\S]))`;
  const block = new RegExp(pattern, "m").exec(text)?.[1];
  return (block ?? "").split(/\r?\n/).flatMap((line) => {
    const match = /^([\w-]+):[ \t]*(.*?)\s*$/.exec(line);
    return match?.[1] === undefined ? [] : [{ key: match[1].toLowerCase(), value: match[2] ?? "" }];
  });
}

function prepended(text: string, lines: string[]): string {
  return lines.length === 0 ? text : `${lines.join("\n")}\n\n${text}`;
}

const CONTACT_HANDLES: [string, string][] = [
  ["admin-c", "Admin"],
  ["tech-c", "Tech"],
];
const FRED_HANDLES: [string, string][] = [["registrant", "Registrant"], ...CONTACT_HANDLES];
const AFNIC_HANDLES: [string, string][] = [["holder-c", "Registrant"], ...CONTACT_HANDLES];

const FRED_CONTACT_KEYS: Record<string, string> = {
  org: "Organization",
  name: "Name",
  "e-mail": "Email",
  phone: "Phone",
  "fax-no": "Fax",
};

function linkedContactLines(text: string, handleKey: string, label: string): string[] {
  const fields = contactBlock(text, handleKey, "contact");
  const addresses = fields.filter(({ key }) => key === "address").map(({ value }) => value);
  const country = /^[A-Z]{2}$/.test(addresses.at(-1) ?? "") ? addresses.pop() : undefined;
  return [
    ...fields.flatMap(({ key, value }) => {
      const part = FRED_CONTACT_KEYS[key];
      return part === undefined ? [] : [`${label} ${part}: ${value}`];
    }),
    ...addresses.map((line) => `${label} Street: ${line}`),
    ...(country === undefined ? [] : [`${label} Country: ${country}`]),
  ];
}

export const linkedRegistrant: Transform = (text) =>
  prepended(
    text,
    FRED_HANDLES.flatMap(([handleKey, label]) => linkedContactLines(text, handleKey, label)),
  );

export const afnicHolder: Transform = (text) =>
  prepended(
    text,
    AFNIC_HANDLES.flatMap(([handleKey, label]) => {
      const fields = contactBlock(text, handleKey, "nic-hdl");
      const organization = fields.some(({ key, value }) => key === "type" && value === "ORGANIZATION");
      const parts: Record<string, string> = {
        contact: organization ? "Organization" : "Name",
        address: "Street",
        country: "Country",
        "e-mail": "Email",
        phone: "Phone",
        "fax-no": "Fax",
      };
      return fields.flatMap(({ key, value }) => (parts[key] === undefined ? [] : [`${label} ${parts[key]}: ${value}`]));
    }),
  );

const ENTITIES: Record<string, string> = { amp: "&", gt: ">", lt: "<", quot: '"', apos: "'" };

export const htmlEntities: Transform = (text) =>
  text.replace(/&(amp|gt|lt|quot|apos);/g, (entity, name: string) => ENTITIES[name] ?? entity);

export const emptyDottedFields: Transform = (text) => text.replace(/^[\p{L}][\p{L}\d ]*\.{2,}:[ \t]*\r?\n/gmu, "");


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

const RIPE_ROLES: [string, string][] = [
  ["registrant", "Registrant"],
  ["admin-c", "Admin"],
  ["tech-c", "Tech"],
  ["billing-c", "Billing"],
];

function nicHandleLines(text: string, handleKey: string, label: string): string[] {
  const handle = new RegExp(`^${handleKey}:[ \\t]+(\\S+)\\s*$`, "m").exec(text)?.[1];
  if (handle === undefined) return [];
  const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = text
    .split(/\r?\n[ \t]*\r?\n/)
    .find((paragraph) => new RegExp(`^nic-hdl:[ \\t]+${escaped}\\s*$`, "m").test(paragraph));
  const fields = (block ?? "").split(/\r?\n/).flatMap((line) => {
    const match = /^([\w -]+?):[ \t]*(.*?)\s*$/.exec(line);
    return match?.[1] === undefined ? [] : [{ key: match[1].toLowerCase(), value: match[2] ?? "" }];
  });
  const addresses = fields.filter(({ key }) => key === "address").map(({ value }) => value);
  const country = /^[A-Z]{2}$/.test(addresses.at(-1) ?? "") ? addresses.pop() : undefined;
  return [
    ...fields.flatMap(({ key, value }) => {
      const part = RIPE_CONTACT_KEYS[key];
      return part === undefined || value === "" ? [] : [`${label} ${part}: ${value}`];
    }),
    ...addresses.map((line) => `${label} Street: ${line}`),
    ...(country === undefined ? [] : [`${label} Country: ${country}`]),
  ];
}

export const nicHandleRegistrant: Transform = (text) => {
  const lines = RIPE_ROLES.flatMap(([handleKey, label]) => nicHandleLines(text, handleKey, label));
  return lines.length === 0 ? text : `${lines.join("\n")}\n\n${text}`;
};
