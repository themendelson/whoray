import type { DropRule } from "#drop.ts";
import { fixedPeriods } from "#drop.ts";
import { addDays, atUtcHour, daysBetween, rolledPast } from "#time.ts";

const uk = fixedPeriods(60, 30, 5);
const isoc: DropRule = ({ expirationDate }) => expirationDate && addDays(expirationDate, 61);

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
  // Observed: .ai names drop at 17:00 UTC, and an update after 14:00 UTC counts from the next day.
  ai: ({ updatedDate, statuses }) => {
    if (!updatedDate) return undefined;
    const days = statuses.has("pendingDelete") ? 28 : statuses.has("redemptionPeriod") ? 58 : undefined;
    return days === undefined ? undefined : atUtcHour(addDays(rolledPast(updatedDate, 14), days), 17);
  },
  co: ({ released }) => released && addDays(rolledPast(released, 17), 1),
  "co.il": isoc,
  "co.uk": uk,
  de: ({ updatedDate, statuses }) =>
    statuses.has("redemptionPeriod") && updatedDate ? addDays(updatedDate, 31) : undefined,
  fr: ({ deleted }) => deleted && addDays(deleted, 30),
  it: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate ? addDays(updatedDate, 33) : undefined,
  ly: ({ expirationDate, updatedDate, statuses }) => {
    if (!expirationDate || !updatedDate) return undefined;
    if (!statuses.has("pendingDelete")) return addDays(expirationDate, 28);
    return addDays(updatedDate, statuses.has("redemptionPeriod") ? 36 : 7);
  },
  md: ({ expirationDate }) => expirationDate && addDays(expirationDate, 31),
  me: ({ updatedDate, statuses }) => updatedDate && addDays(updatedDate, statuses.has("redemptionPeriod") ? 35 : 6),
  "me.uk": uk,
  "org.il": isoc,
  "org.uk": uk,
  si: ({ expirationDate, statuses }) =>
    statuses.has("pendingDelete") && expirationDate ? addDays(expirationDate, 30) : undefined,
  uk,
  us: ({ expirationDate, updatedDate, statuses }) =>
    statuses.has("pendingDelete") && expirationDate && updatedDate
      ? usSchedule(expirationDate, updatedDate)
      : undefined,
  xyz: ({ updatedDate, statuses }) =>
    statuses.has("pendingDelete") && updatedDate
      ? addDays(updatedDate, statuses.has("redemptionPeriod") ? 35 : 5)
      : undefined,
};
