import type { Transform } from "#whois/transforms.ts";
import {
  afnicHolder,
  commentedSections,
  domainEppStatuses,
  emptyDottedFields,
  htmlEntities,
  latestChange,
  linkedRegistrant,
  nicHandleRegistrant,
  recordOnDates,
  registeredOnDate,
} from "#whois/transforms.ts";

const afnic: Transform[] = [domainEppStatuses, afnicHolder];

export const quirks: Record<string, Transform[]> = {
  at: [nicHandleRegistrant],
  cr: [linkedRegistrant],
  cz: [linkedRegistrant],
  fr: afnic,
  gg: [registeredOnDate],
  il: [latestChange],
  is: [nicHandleRegistrant],
  je: [registeredOnDate],
  kz: [emptyDottedFields],
  ls: [linkedRegistrant],
  mk: [linkedRegistrant],
  mw: [linkedRegistrant],
  pm: afnic,
  re: afnic,
  tc: [htmlEntities],
  tf: afnic,
  tn: [emptyDottedFields],
  tw: [recordOnDates],
  ua: [commentedSections],
  wf: afnic,
  yt: afnic,
};
