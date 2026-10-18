import type { Transform } from "#whois/transforms.ts";
import {
  commentedSections,
  domainEppStatuses,
  latestChange,
  recordOnDates,
  registeredOnDate,
} from "#whois/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  fr: [domainEppStatuses],
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  tw: [recordOnDates],
  ua: [commentedSections],
};
