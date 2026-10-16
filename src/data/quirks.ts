import type { Transform } from "#parse/transforms.ts";
import { commentedSections, latestChange, recordOnDates, registeredOnDate } from "#parse/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  tw: [recordOnDates],
  ua: [commentedSections],
};
