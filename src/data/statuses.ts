import { words } from "#data/lists.ts";

export const eppStatuses: readonly string[] = words(`
  ok inactive
  addPeriod autoRenewPeriod renewPeriod transferPeriod redemptionPeriod
  pendingCreate pendingDelete pendingRenew pendingRestore pendingTransfer pendingUpdate
  clientDeleteProhibited clientHold clientRenewProhibited clientTransferProhibited clientUpdateProhibited
  serverDeleteProhibited serverHold serverRenewProhibited serverTransferProhibited serverUpdateProhibited
`);

export const statusSynonyms: Readonly<Record<string, string>> = {
  active: "ok",
  actif: "ok",
  connect: "ok",
  "in quarantine": "redemptionPeriod",
  "on hold": "serverHold",
  "pending cancel": "pendingDelete",
  rédemption: "redemptionPeriod",
  supprimé: "pendingDelete",
  "the domain isn't generated in the zone": "serverHold",
  "transfer locked": "clientTransferProhibited",
  "the domain is locked to transfer.": "clientTransferProhibited",
  "domain transfer locked": "clientTransferProhibited",
  "registrar locked": "clientTransferProhibited",
  "transfer prohibited by registrar": "clientTransferProhibited",
  "update prohibited by registrar": "clientUpdateProhibited",
  "delete prohibited by registrar": "clientDeleteProhibited",
  "transfer prohibited by registry": "serverTransferProhibited",
  "update prohibited by registry": "serverUpdateProhibited",
  "delete prohibited by registry": "serverDeleteProhibited",
};
