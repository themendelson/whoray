#!/usr/bin/env node
import { parseArgs } from "node:util";
import { lookup } from "#node.ts";
import type { WhorayResult } from "#types.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    registrar: { type: "boolean" },
    protocol: { type: "string" },
    raw: { type: "boolean" },
  },
});

const protocols = ["auto", "whois", "rdap"] as const;
const protocol = protocols.find((name) => name === values.protocol);

if (positionals.length === 0 || (values.protocol !== undefined && !protocol)) {
  console.error("Usage: whoray <domain...> [--json] [--raw] [--registrar] [--protocol auto|whois|rdap]");
  process.exit(2);
}

function describe(result: WhorayResult): string {
  const date = (value: Date | undefined): string => value?.toISOString().slice(0, 10) ?? "-";
  const lines = [
    `${result.unicode ?? result.domain}  ${result.state}${result.error ? ` (${result.error.code}: ${result.error.message})` : ""}`,
    `  registrar    ${result.registrar?.name ?? "-"}`,
    `  created      ${date(result.creationDate)}`,
    `  expires      ${date(result.expirationDate)}`,
    `  statuses     ${result.statuses.join(", ") || "-"}`,
    `  nameservers  ${result.nameservers.join(", ") || "-"}`,
    `  source       ${result.source ?? "-"} via ${result.hops.map((hop) => hop.server).join(" -> ") || "-"}`,
  ];
  if (result.dropDate) lines.push(`  drops        ${result.dropDate.toISOString()}`);
  if (values.raw === true) lines.push(...result.hops.map((hop) => `\n--- ${hop.server}\n${hop.raw}`));
  return lines.join("\n");
}

for (const domain of positionals) {
  const result = await lookup(domain, {
    ...(values.registrar === true && { follow: "registrar" }),
    ...(protocol && { protocol }),
  });
  console.log(values.json === true ? JSON.stringify(result, null, 2) : describe(result));
}
