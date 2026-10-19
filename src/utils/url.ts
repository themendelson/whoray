// Not URL.canParse: on Node 22 it starts rejecting valid non-ASCII hosts once the JIT optimizes it.
export function parseUrl(href: string | undefined): URL | undefined {
  try {
    return href === undefined ? undefined : new URL(href);
  } catch {
    return undefined;
  }
}

const IP_ADDRESS = /^[\d.]+$|^\[/;
const PRIVATE_NAME = /(?:^|\.)(?:localhost|local|internal|intranet|lan|home\.arpa)$/;

export function publicUrl(href: string | undefined): URL | undefined {
  const url = parseUrl(href);
  if (url?.protocol !== "https:" || url.port !== "") return undefined;
  const { hostname } = url;
  return hostname.includes(".") && !IP_ADDRESS.test(hostname) && !PRIVATE_NAME.test(hostname) ? url : undefined;
}
