import type { DropRule } from "#drop.ts";
import {
  addDays,
  afterExpiry,
  afterUpdate,
  atUtcHour,
  daysBetween,
  onOrAfterWeekday,
  redemptionGracePeriod,
  rolledPast,
} from "#drop.ts";

const uk = afterExpiry(60 + 30 + 5);
const registryClick = redemptionGracePeriod(34, 4);
const afnic: DropRule = ({ deleted }) => deleted && addDays(deleted, 30);
const zacr = afterExpiry(30);
const WEDNESDAY = 3;
const isoc = afterExpiry(61);

// Observed on .ai: names drop at 17:00 UTC, and an update after 14:00 UTC counts from the next day.
// .io, on the same Identity Digital back end, matched the 28-day pendingDelete.
const identityDigitalCcTld: DropRule = ({ updatedDate, statuses }) => {
  if (!updatedDate) return undefined;
  const days = statuses.has("pendingDelete") ? 28 : statuses.has("redemptionPeriod") ? 58 : undefined;
  return days === undefined ? undefined : atUtcHour(addDays(rolledPast(updatedDate, 14), days), 17);
};

// Offsets observed in .us deletions; they depend on how long after expiry the name was last updated
// and are measured from whichever date the observations lined up with.
function usSchedule(expirationDate: Date, updatedDate: Date): Date {
  const gap = daysBetween(updatedDate, expirationDate);
  if (gap > 31) return addDays(updatedDate, 36);
  if (gap > 30) return addDays(updatedDate, 49);
  if (gap > 14 && gap < 30) return addDays(expirationDate, 80);
  if (gap > 2 && gap <= 14) return addDays(updatedDate, 66);
  if (gap < 0) {
    const day = addDays(expirationDate, 77);
    return day.getUTCDay() === 0 ? addDays(day, -1) : day;
  }
  return addDays(rolledPast(updatedDate, 17), gap <= 7 ? 77 : 60);
}

export const dropRules: Record<string, DropRule> = {
  africa: zacr,
  ai: identityDigitalCcTld,
  am: afterExpiry(45),
  ar: afterExpiry(45),
  // CIRA releases a week's deleted names together, on the following Wednesday.
  ca: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate
      ? onOrAfterWeekday(atUtcHour(addDays(updatedDate, 3), 0), WEDNESDAY)
      : undefined,
  capetown: zacr,
  click: registryClick,
  cn: afterExpiry(47),
  co: ({ released }) => released && addDays(rolledPast(released, 17), 1),
  "co.il": isoc,
  "co.uk": uk,
  country: registryClick,
  de: afterUpdate(31, "redemptionPeriod"),
  diy: registryClick,
  do: afterExpiry(47),
  durban: zacr,
  ee: afterExpiry(45),
  feedback: registryClick,
  food: registryClick,
  forum: registryClick,
  fr: afnic,
  ge: afterExpiry(30),
  hiv: registryClick,
  hk: afterExpiry(90),
  hr: afterExpiry(31),
  id: afterUpdate(37, "redemptionPeriod", "pendingDelete"),
  io: identityDigitalCcTld,
  is: afterExpiry(32),
  it: afterUpdate(33, "pendingDelete"),
  joburg: zacr,
  ke: afterExpiry(94),
  kg: afterExpiry(30),
  kr: afterExpiry(32),
  ky: afterUpdate(31, "pendingDelete"),
  lifestyle: registryClick,
  living: registryClick,
  ls: afterExpiry(61),
  ly: ({ expirationDate, updatedDate, statuses }) => {
    if (!expirationDate || !updatedDate) return undefined;
    if (statuses.has("redemptionPeriod")) return addDays(updatedDate, 36);
    return statuses.has("pendingDelete") ? addDays(updatedDate, 7) : addDays(expirationDate, 28);
  },
  ma: afterExpiry(30),
  md: afterExpiry(31),
  me: ({ updatedDate, statuses }) => updatedDate && addDays(updatedDate, statuses.has("redemptionPeriod") ? 35 : 6),
  "me.uk": uk,
  mk: afterExpiry(122),
  ng: afterExpiry(103),
  observer: registryClick,
  "org.il": isoc,
  "org.uk": uk,
  pid: registryClick,
  pm: afnic,
  property: registryClick,
  pt: afterExpiry(31),
  qa: afterUpdate(32, "pendingDelete"),
  re: afnic,
  realty: registryClick,
  rs: afterExpiry(31),
  sexy: registryClick,
  si: afterExpiry(30, "pendingDelete"),
  sn: redemptionGracePeriod(35, 5),
  tc: afterExpiry(63),
  tf: afnic,
  th: afterUpdate(35, "redemptionPeriod"),
  // ZDNS dates a deletion in Beijing time (UTC+8): an update after 16:00 UTC counts from the next day.
  top: ({ updatedDate, statuses }) =>
    updatedDate && (statuses.has("pendingDelete") || statuses.has("redemptionPeriod"))
      ? atUtcHour(addDays(rolledPast(updatedDate, 16), 36), 0)
      : undefined,
  trust: registryClick,
  tw: afterExpiry(33),
  tz: afterExpiry(59),
  uk,
  us: ({ expirationDate, updatedDate, statuses }) =>
    statuses.has("pendingDelete") && expirationDate && updatedDate
      ? usSchedule(expirationDate, updatedDate)
      : undefined,
  vana: registryClick,
  vg: redemptionGracePeriod(34, 5),
  wf: afnic,
  xyz: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate
      ? addDays(updatedDate, statuses.has("redemptionPeriod") ? 35 : 5)
      : undefined,
  yt: afnic,
};
