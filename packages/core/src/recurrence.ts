import type { DailyPlanRepeat } from "./types";
import { addDays, parseISODate, toISODate } from "./date";

export const MAX_DAILY_PLAN_REPEAT_COUNT = 365;

export interface NormalizedDailyPlanRepeat {
  frequency: DailyPlanRepeat;
  count: number;
}

const DAILY_PLAN_REPEAT_VALUES: readonly DailyPlanRepeat[] = [
  "none",
  "daily",
  "weekly",
  "monthly",
];

/** Normalize and validate the repeat rule supplied by a form or an import. */
export function normalizeDailyPlanRepeat(
  frequency: DailyPlanRepeat = "none",
  count = 1,
): NormalizedDailyPlanRepeat {
  if (!Number.isInteger(count) || count < 1 || count > MAX_DAILY_PLAN_REPEAT_COUNT) {
    throw new Error(`重复次数必须是 1-${MAX_DAILY_PLAN_REPEAT_COUNT} 之间的整数。`);
  }
  if (!DAILY_PLAN_REPEAT_VALUES.includes(frequency)) {
    throw new Error("重复方式无效。");
  }
  if (frequency === "none" || count === 1) {
    return { frequency: "none", count: 1 };
  }
  return { frequency, count };
}

function addMonthsClamped(startISO: string, months: number): string {
  const start = parseISODate(startISO);
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return toISODate(target);
}

/** Return concrete dates for a repeat rule, including the initial date. */
export function expandDailyPlanDates(
  startISO: string,
  frequency: DailyPlanRepeat = "none",
  count = 1,
): string[] {
  const normalized = normalizeDailyPlanRepeat(frequency, count);
  return Array.from({ length: normalized.count }, (_, index) => {
    if (normalized.frequency === "daily") return toISODate(addDays(parseISODate(startISO), index));
    if (normalized.frequency === "weekly") return toISODate(addDays(parseISODate(startISO), index * 7));
    if (normalized.frequency === "monthly") return addMonthsClamped(startISO, index);
    return startISO;
  });
}

export function dailyPlanRepeatLabel(frequency: DailyPlanRepeat): string {
  switch (frequency) {
    case "daily":
      return "每日";
    case "weekly":
      return "每周";
    case "monthly":
      return "每月";
    default:
      return "不重复";
  }
}
