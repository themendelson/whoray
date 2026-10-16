import type { Transform } from "#whois/transforms.ts";
import { latestChange, recordOnDates, registeredOnDate } from "#whois/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  tw: [recordOnDates],
};
