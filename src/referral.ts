import { parseUrl } from "#domain.ts";

const IP_ADDRESS = /^[\d.]+$|^\[/;
const PRIVATE_NAME = /(?:^|\.)(?:localhost|local|internal|intranet|lan|home\.arpa)$/;

export function publicUrl(href: string | undefined): URL | undefined {
  const url = parseUrl(href);
  if (url?.protocol !== "https:" || url.port !== "") return undefined;
  const { hostname } = url;
  return hostname.includes(".") && !IP_ADDRESS.test(hostname) && !PRIVATE_NAME.test(hostname) ? url : undefined;
}
