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
  server?: string | undefined;
  retryAfter?: number | undefined;
}

export interface Address {
  street?: string[] | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  fax?: string | undefined;
}

export interface Registrar extends Address {
  name: string;
  ianaId?: number | undefined;
  url?: string | undefined;
  abuseEmail?: string | undefined;
  abusePhone?: string | undefined;
  whoisServer?: string | undefined;
}

export interface Registry {
  id: string;
  name: string;
}

export interface Contact extends Address {
  name?: string | undefined;
  organization?: string | undefined;
}

export type Registrant = Contact;

export interface DomainRecord {
  domain: string;
  unicode?: string | undefined;
  tld: string;
  state: DomainState;
  isAvailable?: boolean | undefined;
  premium?: true | undefined;
  registrar?: Registrar | undefined;
  registrant?: Contact | undefined;
  admin?: Contact | undefined;
  tech?: Contact | undefined;
  billing?: Contact | undefined;
  registry?: Registry | undefined;
  handle?: string | undefined;
  creationDate?: Date | undefined;
  updatedDate?: Date | undefined;
  expirationDate?: Date | undefined;
  dropDate?: Date | undefined;
  snapshotDate?: Date | undefined;
  statuses: string[];
  nameservers: string[];
  dnssec?: boolean | undefined;
  error?: WhorayError | undefined;
}

export interface Hop {
  protocol: Protocol;
  server: string;
  raw: string;
}

export interface WhorayResult extends DomainRecord {
  source?: Protocol | undefined;
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
