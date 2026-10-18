import type { DomainRecord, WhorayError } from "#types.ts";

type Published = Pick<
  DomainRecord,
  | "registrar"
  | "registrant"
  | "admin"
  | "tech"
  | "billing"
  | "handle"
  | "creationDate"
  | "updatedDate"
  | "expirationDate"
  | "snapshotDate"
  | "statuses"
  | "nameservers"
  | "dnssec"
>;

export interface Registration extends Published {
  kind: "record";
  released?: Date;
  deleted?: Date;
  registryId?: string;
  registrarWhois?: string;
  registrarRdap?: string;
}

export type Found =
  | Registration
  | { kind: "available"; premium?: true }
  | { kind: "dropzone" }
  | { kind: "reserved" }
  | ({ kind: "error" } & WhorayError);
