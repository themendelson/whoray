#!/usr/bin/env node
import { parseArgs } from "node:util";
import { lookup } from "#runtime/node.ts";
import type { LookupOptions, WhorayResult } from "#types.ts";

const USAGE = `Usage: whoray <domain...> [options]

  --protocol <auto|whois|rdap>  which protocol to ask (default: auto)
  --registrar                   also ask the registrar's server
  --json                        print the full result as JSON
  --raw                         print every raw reply
  -h, --help                    show this help`;

const protocols: NonNullable<LookupOptions["protocol"]>[] = ["auto", "whois", "rdap"];

function usage(problem?: string): never {
  if (problem === undefined) {
    console.log(USAGE);
    process.exit(0);
  }
  console.error(`${problem}\n\n${USAGE}`);
  process.exit(2);
}

const config = {
  allowPositionals: true,
  options: {
    json: { type: "boolean" },
    registrar: { type: "boolean" },
    protocol: { type: "string" },
    raw: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
} as const;

function parse(): ReturnType<typeof parseArgs<typeof config>> {
  try {
    return parseArgs(config);
  } catch (error) {
    return usage(error instanceof Error ? error.message : String(error));
  }
}

const { values, positionals } = parse();
const protocol = protocols.find((name) => name === values.protocol);
if (values.help === true) usage();
if (positionals.length === 0) usage("No domain given.");
if (values.protocol !== undefined && !protocol) usage(`Unknown protocol "${values.protocol}".`);

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

const options: LookupOptions = {
  ...(values.registrar === true && { follow: "registrar" }),
  ...(protocol && { protocol }),
};

for (const domain of positionals) {
  try {
    const result = await lookup(domain, options);
    console.log(values.json === true ? JSON.stringify(result, null, 2) : describe(result));
    if (result.error) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
