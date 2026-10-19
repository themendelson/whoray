export type DomainState =
  | "registered"
  | "expired"
  | "redemption"
  | "pendingDelete"
  | "available"
  | "dropzone"
  | "reserved"
  | "unknown";

export type Protocol = "whois" | "rdap";

export type ErrorCode = "timeout" | "rate_limited" | "blocked" | "no_server" | "unparseable" | "network";

export interface WhorayError {
  code: ErrorCode;
  message: string;
  server?: string;
  retryAfter?: number;
}

export interface Address {
  street?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  email?: string;
  phone?: string;
  fax?: string;
}

export interface Registrar extends Address {
  name: string;
  ianaId?: number;
  url?: string;
  abuseEmail?: string;
  abusePhone?: string;
  whoisServer?: string;
}

export interface Registry {
  id: string;
  name: string;
}

export interface Contact extends Address {
  name?: string;
  organization?: string;
}

export type Registrant = Contact;

export interface DomainRecord {
  domain: string;
  unicode?: string;
  tld: string;
  state: DomainState;
  isAvailable?: boolean;
  premium?: true;
  registrar?: Registrar;
  registrant?: Contact;
  admin?: Contact;
  tech?: Contact;
  billing?: Contact;
  registry?: Registry;
  handle?: string;
  creationDate?: Date;
  updatedDate?: Date;
  expirationDate?: Date;
  dropDate?: Date;
  snapshotDate?: Date;
  statuses: string[];
  nameservers: string[];
  dnssec?: boolean;
  error?: WhorayError;
}

export interface Hop {
  role: "registry" | "registrar";
  protocol: Protocol;
  server: string;
  raw: string;
}

export interface WhorayResult extends DomainRecord {
  source?: Protocol;
  hops: Hop[];
}

export interface ServerEntry {
  whois?: string | false;
  rdap?: string | false;
  query?: string;
  prefer?: Protocol;
}

export interface Socket {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

export type Connect = (host: string, port: number, signal?: AbortSignal) => Promise<Socket>;

export interface LookupOptions {
  protocol?: "auto" | Protocol;
  follow?: "registry" | "registrar";
  timeout?: number;
  signal?: AbortSignal;
  servers?: Readonly<Record<string, ServerEntry>>;
  connect?: Connect;
  fetch?: typeof fetch;
}
