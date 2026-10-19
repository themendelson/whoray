import type { Transform } from "#whois/transforms.ts";
import * as transform from "#whois/transforms.ts";

const afnic: Transform[] = [transform.domainEppStatuses, transform.afnicHolder];

export const quirks: Record<string, Transform[]> = {
  at: [transform.nicHandleRegistrant],
  cr: [transform.linkedRegistrant],
  cz: [transform.linkedRegistrant],
  fr: afnic,
  gg: [transform.registeredOnDate],
  il: [transform.latestChange, transform.registrantEmail],
  is: [transform.nicHandleRegistrant],
  je: [transform.registeredOnDate],
  kg: [transform.headerStatus],
  kz: [transform.emptyDottedFields],
  ls: [transform.linkedRegistrant],
  mk: [transform.linkedRegistrant],
  mw: [transform.linkedRegistrant],
  pm: afnic,
  re: afnic,
  sk: [transform.handleParagraphs],
  tc: [transform.htmlEntities],
  tf: afnic,
  tn: [transform.emptyDottedFields],
  tr: [transform.addressContinuations],
  tw: [transform.recordOnDates],
  ua: [transform.commentedSections],
  wf: afnic,
  yt: afnic,
};
