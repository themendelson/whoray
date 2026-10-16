import type { DropRule } from "#drop.ts";
import { addDays, atUtcHour, daysBetween, fixedPeriods, rolledPast } from "#drop.ts";

const uk = fixedPeriods(60, 30, 5);

function usSchedule(expires: Date, updated: Date): Date {
  const gap = daysBetween(updated, expires);
  if (gap > 31) return addDays(updated, 36);
  if (gap > 30) return addDays(updated, 49);
  if (gap > 14 && gap < 30) return addDays(expires, 80);
  if (gap > 2 && gap <= 14) return addDays(updated, 66);
  if (gap < 0) {
    const day = addDays(expires, 77);
    return day.getUTCDay() === 0 ? addDays(day, -1) : day;
  }
  return addDays(rolledPast(updated, 17), gap <= 7 ? 77 : 60);
}

export const dropRules: Record<string, DropRule> = {
  ai: ({ updated, statuses }) => {
    if (!updated) return undefined;
    const days = statuses.has("pendingDelete") ? 28 : statuses.has("redemptionPeriod") ? 58 : undefined;
    return days === undefined ? undefined : atUtcHour(addDays(rolledPast(updated, 14), days), 17);
  },
  co: ({ released }) => released && addDays(rolledPast(released, 17), 1),
  "co.il": ({ expires }) => expires && addDays(expires, 62),
  "co.uk": uk,
  de: ({ updated, statuses }) => (statuses.has("redemptionPeriod") && updated ? addDays(updated, 31) : undefined),
  fr: ({ deleted }) => deleted && addDays(deleted, 30),
  it: ({ updated, statuses }) => (statuses.has("pendingDelete") && updated ? addDays(updated, 33) : undefined),
  ly: ({ expires, updated, statuses }) => {
    if (!expires || !updated) return undefined;
    if (!statuses.has("pendingDelete")) return addDays(expires, 28);
    return addDays(updated, statuses.has("redemptionPeriod") ? 36 : 7);
  },
  me: ({ updated, statuses }) => updated && addDays(updated, statuses.has("redemptionPeriod") ? 35 : 6),
  "me.uk": uk,
  "org.uk": uk,
  si: ({ expires, statuses }) => (statuses.has("pendingDelete") && expires ? addDays(expires, 30) : undefined),
  uk,
  us: ({ expires, updated, statuses }) =>
    statuses.has("pendingDelete") && expires && updated ? usSchedule(expires, updated) : undefined,
  xyz: ({ updated, statuses }) =>
    statuses.has("pendingDelete") && updated ? addDays(updated, statuses.has("redemptionPeriod") ? 35 : 5) : undefined,
};
