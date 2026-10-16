import type { ErrorCode, Registrant, Registrar } from "#types.ts";

export interface Registration {
  kind: "record";
  registrar?: Registrar;
  registrant?: Registrant;
  handle?: string;
  created?: Date;
  updated?: Date;
  expires?: Date;
  released?: Date;
  deleted?: Date;
  database?: Date;
  registryId?: string;
  statuses: string[];
  nameservers: string[];
  dnssec?: boolean;
  registrarWhois?: string;
  registrarRdap?: string;
}

export type Found =
  | Registration
  | { kind: "available"; premium?: true }
  | { kind: "dropzone" }
  | { kind: "reserved" }
  | { kind: "error"; code: ErrorCode; message: string; server?: string; retryAfter?: number };
