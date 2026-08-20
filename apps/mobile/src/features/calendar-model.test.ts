import type { DailyPlan, Task } from "@task-orbit/core";
import { describe, expect, it } from "vitest";

import {
  calendarHeading,
  layoutPlanColumns,
  monthGridDays,
  taskRangeInWeek,
  visibleHourRange,
} from "./calendar-model";

function plan(id: string, startTime: string, endTime: string): DailyPlan {
  return {
    id,
    projectId: null,
    taskId: null,
    name: id,
    description: "",
    date: "2026-08-20",
    startTime,
    endTime,
    done: false,
    estimatedMinutes: 60,
    recurrence: { frequency: "none", count: 1, seriesId: null, occurrence: 1 },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("mobile calendar model", () => {
  it("builds a stable 6-week Monday-first month grid", () => {
    const days = monthGridDays(new Date(2026, 7, 20));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(1);
    expect(days[0].getMonth()).toBe(6);
    expect(days[41].getMonth()).toBe(8);
  });

  it("clips task ranges to the visible week", () => {
    const task = { startDate: "2026-08-14", endDate: "2026-08-20" } as Task;
    expect(taskRangeInWeek(task, new Date(2026, 7, 20))).toEqual({ startIndex: 0, endIndex: 3 });
    expect(taskRangeInWeek({ startDate: "2026-08-24", endDate: "2026-08-25" } as Task, new Date(2026, 7, 20))).toBeNull();
  });

  it("places overlapping plans in separate columns and reuses free columns", () => {
    const layouts = layoutPlanColumns([
      plan("a", "09:00", "10:00"),
      plan("b", "09:30", "11:00"),
      plan("c", "10:00", "10:30"),
    ]);
    expect(layouts.get("a")).toEqual({ column: 0, columnCount: 2 });
    expect(layouts.get("b")).toEqual({ column: 1, columnCount: 2 });
    expect(layouts.get("c")).toEqual({ column: 0, columnCount: 2 });
  });

  it("expands the default mobile hour range only when plans require it", () => {
    expect(visibleHourRange([])).toEqual({ startHour: 6, endHour: 22 });
    expect(visibleHourRange([plan("late", "05:30", "23:15")])).toEqual({ startHour: 5, endHour: 24 });
  });

  it("formats headings for all primary views", () => {
    const anchor = new Date(2026, 7, 20);
    expect(calendarHeading("month", anchor)).toBe("2026年8月");
    expect(calendarHeading("week", anchor)).toBe("8月17日 - 8月23日");
    expect(calendarHeading("day", anchor)).toContain("2026年8月20日");
  });
});
