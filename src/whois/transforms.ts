export type Transform = (text: string) => string;

export const registeredOnDate: Transform = (text) =>
  text.replace(/^\s*Registered on (.+?) at ([\d:]+)/m, "Created: $1 $2");

export const latestChange: Transform = (text) => {
  const stamps = [...text.matchAll(/^changed:.*?\b(\d{8})\b/gm)].map((match) => match[1] ?? "");
  const latest = stamps.sort().at(-1);
  return latest === undefined ? text : `Updated: ${latest}\n${text}`;
};

export const recordOnDates: Transform = (text) => text.replace(/^\s*Record (expires|created) on /gm, "\n$1: ");

export const domainEppStatuses: Transform = (text) => {
  const block = /^domain:[\s\S]*?(?=\n[ \t]*\n)/m.exec(text)?.[0];
  return block === undefined ? text : text.replace(block, block.replace(/^eppstatus:/gm, "epp status:"));
};
