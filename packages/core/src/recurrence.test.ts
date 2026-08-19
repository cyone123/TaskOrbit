import { describe, expect, it } from "vitest";
import {
  expandDailyPlanDates,
  normalizeDailyPlanRepeat,
} from "./recurrence";

describe("daily plan recurrence", () => {
  it("expands daily and weekly occurrences from the initial date", () => {
    expect(expandDailyPlanDates("2026-08-17", "daily", 3)).toEqual([
      "2026-08-17",
      "2026-08-18",
      "2026-08-19",
    ]);
    expect(expandDailyPlanDates("2026-08-17", "weekly", 3)).toEqual([
      "2026-08-17",
      "2026-08-24",
      "2026-08-31",
    ]);
  });

  it("clamps monthly occurrences to the last day of shorter months", () => {
    expect(expandDailyPlanDates("2026-01-31", "monthly", 3)).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("treats a single occurrence as non-repeating and rejects unsafe counts", () => {
    expect(normalizeDailyPlanRepeat("daily", 1)).toEqual({
      frequency: "none",
      count: 1,
    });
    expect(() => normalizeDailyPlanRepeat("daily", 0)).toThrow("重复次数");
  });
});
