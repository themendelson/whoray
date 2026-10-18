import type { Transform } from "#whois/transforms.ts";
import {
  commentedSections,
  domainEppStatuses,
  latestChange,
  linkedRegistrant,
  recordOnDates,
  registeredOnDate,
} from "#whois/transforms.ts";

export const quirks: Record<string, Transform[]> = {
  cz: [linkedRegistrant],
  fr: [domainEppStatuses],
  gg: [registeredOnDate],
  il: [latestChange],
  je: [registeredOnDate],
  mk: [linkedRegistrant],
  tw: [recordOnDates],
  ua: [commentedSections],
};
