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

const CONTACT_KEYS: Record<string, string> = {
  org: "Registrant Organization",
  name: "Registrant Name",
  "e-mail": "Registrant Email",
  phone: "Registrant Phone",
};

export const linkedRegistrant: Transform = (text) => {
  const handle = /^registrant:[ \t]+(\S+)\s*$/m.exec(text)?.[1];
  if (handle === undefined) return text;
  const escaped = handle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = new RegExp(
    `^contact:[ \\t]+${escaped}[ \\t]*\\r?\\n([\\s\\S]*?)(?:\\r?\\n[ \\t]*\\r?\\n|(?![\\s\\S]))`,
    "m",
  ).exec(text)?.[1];
  if (block === undefined) return text;
  const fields = block.split(/\r?\n/).flatMap((line) => {
    const match = /^([\w-]+):[ \t]*(.*?)\s*$/.exec(line);
    return match?.[1] === undefined ? [] : [{ key: match[1], value: match[2] ?? "" }];
  });
  const addresses = fields.filter(({ key }) => key === "address").map(({ value }) => value);
  const country = /^[A-Z]{2}$/.test(addresses.at(-1) ?? "") ? addresses.pop() : undefined;
  const lines = [
    ...fields.flatMap(({ key, value }) => (CONTACT_KEYS[key] === undefined ? [] : [`${CONTACT_KEYS[key]}: ${value}`])),
    ...addresses.map((line) => `Registrant Street: ${line}`),
    ...(country === undefined ? [] : [`Registrant Country: ${country}`]),
  ];
  return `${lines.join("\n")}\n\n${text}`;
};
