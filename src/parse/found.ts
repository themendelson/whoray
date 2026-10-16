import type { ErrorCode, Registrar } from "#types.ts";

export interface Registration {
  kind: "record";
  registrar?: Registrar;
  created?: Date;
  updated?: Date;
  expires?: Date;
  released?: Date;
  statuses: string[];
  nameservers: string[];
  dnssec?: boolean;
  registrarWhois?: string;
  registrarRdap?: string;
}

export type Found =
  | Registration
  | { kind: "available" }
  | { kind: "reserved" }
  | { kind: "error"; code: ErrorCode; message: string; retryAfter?: number };
