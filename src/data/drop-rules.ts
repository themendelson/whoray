import type { DropRule } from "#drop.ts";
import { fixedPeriods, redemptionGracePeriod } from "#drop.ts";
import { addDays, atUtcHour, daysBetween, onOrAfterWeekday, rolledPast } from "#time.ts";

const uk = fixedPeriods(60, 30, 5);
const registryClick = redemptionGracePeriod(34, 4);
const afnic: DropRule = ({ deleted }) => deleted && addDays(deleted, 30);
const zacr: DropRule = ({ expirationDate }) => expirationDate && addDays(expirationDate, 30);
const WEDNESDAY = 3;
const isoc: DropRule = ({ expirationDate }) => expirationDate && addDays(expirationDate, 61);

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
  am: ({ expirationDate }) => expirationDate && addDays(expirationDate, 45),
  ar: ({ expirationDate }) => expirationDate && addDays(expirationDate, 45),
  // CIRA releases a week's deleted names together, on the following Wednesday.
  ca: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate
      ? onOrAfterWeekday(atUtcHour(addDays(updatedDate, 3), 0), WEDNESDAY)
      : undefined,
  capetown: zacr,
  click: registryClick,
  co: ({ released }) => released && addDays(rolledPast(released, 17), 1),
  "co.il": isoc,
  "co.uk": uk,
  country: registryClick,
  do: ({ expirationDate }) => expirationDate && addDays(expirationDate, 47),
  de: ({ updatedDate, statuses }) =>
    statuses.has("redemptionPeriod") && updatedDate ? addDays(updatedDate, 31) : undefined,
  diy: registryClick,
  durban: zacr,
  feedback: registryClick,
  food: registryClick,
  forum: registryClick,
  fr: afnic,
  ge: ({ expirationDate }) => expirationDate && addDays(expirationDate, 30),
  hiv: registryClick,
  hk: ({ expirationDate }) => expirationDate && addDays(expirationDate, 90),
  hr: ({ expirationDate }) => expirationDate && addDays(expirationDate, 31),
  io: identityDigitalCcTld,
  is: ({ expirationDate }) => expirationDate && addDays(expirationDate, 32),
  it: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate ? addDays(updatedDate, 33) : undefined,
  joburg: zacr,
  ke: ({ expirationDate }) => expirationDate && addDays(expirationDate, 94),
  kr: ({ expirationDate }) => expirationDate && addDays(expirationDate, 32),
  lifestyle: registryClick,
  living: registryClick,
  ly: ({ expirationDate, updatedDate, statuses }) => {
    if (!expirationDate || !updatedDate) return undefined;
    if (!statuses.has("pendingDelete")) return addDays(expirationDate, 28);
    return addDays(updatedDate, statuses.has("redemptionPeriod") ? 36 : 7);
  },
  ma: ({ expirationDate }) => expirationDate && addDays(expirationDate, 30),
  md: ({ expirationDate }) => expirationDate && addDays(expirationDate, 31),
  me: ({ updatedDate, statuses }) => updatedDate && addDays(updatedDate, statuses.has("redemptionPeriod") ? 35 : 6),
  mk: ({ expirationDate }) => expirationDate && addDays(expirationDate, 122),
  "me.uk": uk,
  observer: registryClick,
  "org.il": isoc,
  "org.uk": uk,
  pid: registryClick,
  pm: afnic,
  property: registryClick,
  pt: ({ expirationDate }) => expirationDate && addDays(expirationDate, 31),
  qa: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate ? addDays(updatedDate, 32) : undefined,
  re: afnic,
  realty: registryClick,
  sexy: registryClick,
  si: ({ expirationDate, statuses }) =>
    statuses.has("pendingDelete") && expirationDate ? addDays(expirationDate, 30) : undefined,
  // ZDNS dates a deletion in Beijing time (UTC+8): an update after 16:00 UTC counts from the next day.
  sn: redemptionGracePeriod(35, 5),
  tc: ({ expirationDate }) => expirationDate && addDays(expirationDate, 63),
  tf: afnic,
  top: ({ updatedDate, statuses }) =>
    updatedDate && (statuses.has("pendingDelete") || statuses.has("redemptionPeriod"))
      ? atUtcHour(addDays(rolledPast(updatedDate, 16), 36), 0)
      : undefined,
  trust: registryClick,
  tz: ({ expirationDate }) => expirationDate && addDays(expirationDate, 59),
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
