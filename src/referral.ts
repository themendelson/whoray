import { hostnameOf } from "#domain.ts";

const IP_ADDRESS = /^[\d.]+$|^\[/;
const PRIVATE_NAME = /(?:^|\.)(?:localhost|local|internal|intranet|lan|home\.arpa)$/;

function publicHostname(host: string): string | undefined {
  const hostname = hostnameOf(host);
  return hostname.includes(".") && !IP_ADDRESS.test(hostname) && !PRIVATE_NAME.test(hostname) ? hostname : undefined;
}

export function referralHost(host: string | undefined, current: string): string | undefined {
  const hostname = host === undefined ? undefined : publicHostname(host);
  return hostname === current ? undefined : hostname;
}

export function referralUrl(href: string | undefined): string | undefined {
  if (href === undefined || !URL.canParse(href)) return undefined;
  const url = new URL(href);
  const safe = url.protocol === "https:" && url.port === "" && publicHostname(url.hostname) !== undefined;
  return safe ? url.href : undefined;
}
