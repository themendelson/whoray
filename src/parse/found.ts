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
  released?: Date | undefined;
  deleted?: Date | undefined;
  registryId?: string | undefined;
  registrarWhois?: string | undefined;
  registrarRdap?: string | undefined;
}

export type Found =
  | Registration
  | { kind: "available"; premium?: true | undefined }
  | { kind: "dropzone" }
  | { kind: "reserved" }
  | ({ kind: "error" } & WhorayError);
