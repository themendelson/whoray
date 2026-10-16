import type { Transform } from "#parse/transforms.ts";
import { domainEppStatuses, latestChange, recordOnDates, registeredOnDate } from "#parse/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  fr: [domainEppStatuses],
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  tw: [recordOnDates],
};
