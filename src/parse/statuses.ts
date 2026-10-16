const EPP = [
  "ok",
  "inactive",
  "addPeriod",
  "autoRenewPeriod",
  "renewPeriod",
  "transferPeriod",
  "redemptionPeriod",
  "pendingRestore",
  "pendingDelete",
  "pendingCreate",
  "pendingRenew",
  "pendingTransfer",
  "pendingUpdate",
  "clientDeleteProhibited",
  "clientHold",
  "clientRenewProhibited",
  "clientTransferProhibited",
  "clientUpdateProhibited",
  "serverDeleteProhibited",
  "serverHold",
  "serverRenewProhibited",
  "serverTransferProhibited",
  "serverUpdateProhibited",
];

const byKey = new Map<string, string>([...EPP.map((code) => [code.toLowerCase(), code] as const), ["active", "ok"]]);

export function normalizeStatuses(values: string[]): string[] {
  const statuses = values
    .flatMap((value) => value.split(","))
    .map(
      (value) =>
        value
          .trim()
          .split(/\s+(?:\(|https?:)/)[0]
          ?.trim() ?? "",
    )
    .filter((value) => value !== "")
    .map((value) => byKey.get(value.toLowerCase().replace(/[\s_-]+/g, "")) ?? value);
  return [...new Set(statuses)];
}
