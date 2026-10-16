export type DomainState =
  | "registered"
  | "expired"
  | "redemption"
  | "pendingDelete"
  | "available"
  | "reserved"
  | "unknown";

export type ErrorCode = "timeout" | "rate_limited" | "blocked" | "no_server" | "unparseable" | "network";

export interface WhorayError {
  code: ErrorCode;
  message: string;
  server?: string;
  retryAfter?: number;
}

export interface Registrar {
  name: string;
  ianaId?: number;
  url?: string;
  abuseEmail?: string;
  abusePhone?: string;
}

export interface Registry {
  id: string;
  name: string;
}

export interface Registrant {
  name?: string;
  organization?: string;
  country?: string;
}

export interface Drop {
  at: Date;
  confidence: "high" | "low";
  basis: string;
}

export interface DomainRecord {
  domain: string;
  unicode: string;
  tld: string;
  state: DomainState;
  registrar?: Registrar;
  registrant?: Registrant;
  registry?: Registry;
  handle?: string;
  dates: { created?: Date; updated?: Date; expires?: Date };
  statuses: string[];
  nameservers: string[];
  dnssec?: boolean;
  drop?: Drop;
}

export interface Hop {
  protocol: "rdap" | "whois";
  server: string;
  raw: string;
}

export interface WhorayResult extends DomainRecord {
  source: "rdap" | "whois";
  hops: Hop[];
  error?: WhorayError;
}

export interface ServerEntry {
  rdap?: string;
  whois?: string;
  query?: string;
}

export interface Socket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

export type Connect = (host: string, port: number, signal?: AbortSignal) => Promise<Socket>;

export interface LookupOptions {
  follow?: "registry" | "registrar";
  rdap?: "prefer" | "only" | "never";
  timeout?: number;
  signal?: AbortSignal;
  servers?: Record<string, ServerEntry>;
  connect?: Connect;
  fetch?: typeof fetch;
  concurrency?: number;
}
