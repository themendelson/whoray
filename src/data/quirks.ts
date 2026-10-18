import type { Transform } from "#whois/transforms.ts";
import { domainEppStatuses, latestChange, recordOnDates, registeredOnDate } from "#whois/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  fr: [domainEppStatuses],
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  tw: [recordOnDates],
};
