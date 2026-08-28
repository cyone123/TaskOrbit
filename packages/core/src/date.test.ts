import { describe, expect, it } from "vitest";
import {
  addDays,
  formatDate,
  formatDateFull,
  formatDateShort,
  formatDurationMinutes,
  formatTime,
  inDateRange,
  isSameDay,
  isTimeRangeValid,
  isToday,
  isWeekend,
  layoutPlanColumns,
  minutesToTime,
  monthLabel,
  parseISODate,
  relativeRangeLabel,
  startOfWeek,
  timeToMinutes,
  toISODate,
  todayISO,
  weekdayCN,
  weekDays,
} from "./date";

describe("date helpers", () => {
  it("converts to and from ISO date strings correctly", () => {
    const date = new Date(2026, 7, 20); // 2026-08-20
    expect(toISODate(date)).toBe("2026-08-20");
    const parsed = parseISODate("2026-08-20");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(20);
  });

  it("handles todayISO and isToday", () => {
    const today = todayISO();
    expect(isToday(today)).toBe(true);
    expect(isToday("2000-01-01")).toBe(false);
  });

  it("adds days correctly", () => {
    const d = new Date(2026, 7, 20);
    const next = addDays(d, 5);
    expect(toISODate(next)).toBe("2026-08-25");
    const prev = addDays(d, -5);
    expect(toISODate(prev)).toBe("2026-08-15");
  });

  it("computes start of week and week days (Monday start)", () => {
    // 2026-08-20 is a Thursday
    const d = new Date(2026, 7, 20);
    const start = startOfWeek(d);
    expect(toISODate(start)).toBe("2026-08-17"); // Monday
    const days = weekDays(d);
    expect(days).toHaveLength(7);
    expect(toISODate(days[0])).toBe("2026-08-17");
    expect(toISODate(days[6])).toBe("2026-08-23");
  });

  it("checks same day and weekend", () => {
    const d1 = new Date(2026, 7, 20);
    const d2 = new Date(2026, 7, 20, 10, 30);
    const d3 = new Date(2026, 7, 21);
    expect(isSameDay(d1, d2)).toBe(true);
    expect(isSameDay(d1, d3)).toBe(false);

    const saturday = new Date(2026, 7, 22);
    const sunday = new Date(2026, 7, 23);
    const monday = new Date(2026, 7, 24);
    expect(isWeekend(saturday)).toBe(true);
    expect(isWeekend(sunday)).toBe(true);
    expect(isWeekend(monday)).toBe(false);
  });

  it("formats dates into Chinese strings", () => {
    expect(formatDate("2026-08-20")).toBe("8月20日");
    expect(formatDateShort("2026-08-20")).toBe("8/20");
    expect(formatDateFull("2026-08-20")).toBe("2026年8月20日 周四");
    expect(weekdayCN(new Date(2026, 7, 20))).toBe("周四");
    expect(monthLabel(new Date(2026, 7, 20))).toBe("2026年8月");
    expect(relativeRangeLabel("2026-08-01", "2026-08-15")).toBe("8/1 - 8/15");
  });

  it("converts time to minutes and vice versa", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("13:00")).toBe(780);
    expect(timeToMinutes("23:59")).toBe(1439);

    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(780)).toBe("13:00");
  });

  it("formats time with AM/PM indicator and duration", () => {
    expect(formatTime("09:05")).toBe("上午 9:05");
    expect(formatTime("12:00")).toBe("下午 12:00");
    expect(formatTime("13:00")).toBe("下午 1:00");
    expect(formatTime("00:00")).toBe("上午 12:00");

    expect(formatDurationMinutes(30)).toBe("30 分钟");
    expect(formatDurationMinutes(60)).toBe("1 小时");
    expect(formatDurationMinutes(90)).toBe("1 小时 30 分钟");
  });

  it("validates time and date ranges", () => {
    expect(isTimeRangeValid("09:00", "10:00")).toBe(true);
    expect(isTimeRangeValid("10:00", "09:00")).toBe(false);
    expect(isTimeRangeValid("10:00", "10:00")).toBe(false);

    expect(inDateRange("2026-08-10", "2026-08-01", "2026-08-20")).toBe(true);
    expect(inDateRange("2026-08-01", "2026-08-01", "2026-08-20")).toBe(true);
    expect(inDateRange("2026-08-20", "2026-08-01", "2026-08-20")).toBe(true);
    expect(inDateRange("2026-08-25", "2026-08-01", "2026-08-20")).toBe(false);
  });

  it("handles layoutPlanColumns for overlapping and non-overlapping plans", () => {
    expect(layoutPlanColumns([])).toEqual(new Map());

    // Single plan
    const single = layoutPlanColumns([{ id: "1", startTime: "09:00", endTime: "10:00" }]);
    expect(single.get("1")).toEqual({ column: 0, columnCount: 1 });

    // Two identical time plans sharing horizontal space
    const double = layoutPlanColumns([
      { id: "a", startTime: "13:00", endTime: "14:00" },
      { id: "b", startTime: "13:00", endTime: "14:00" },
    ]);
    expect(double.get("a")).toEqual({ column: 0, columnCount: 2 });
    expect(double.get("b")).toEqual({ column: 1, columnCount: 2 });

    // Overlapping morning plans + independent afternoon plan
    const mixed = layoutPlanColumns([
      { id: "m1", startTime: "09:00", endTime: "10:00" },
      { id: "m2", startTime: "09:30", endTime: "11:00" },
      { id: "m3", startTime: "10:00", endTime: "10:30" },
      { id: "afternoon", startTime: "14:00", endTime: "15:00" },
    ]);
    expect(mixed.get("m1")).toEqual({ column: 0, columnCount: 2 });
    expect(mixed.get("m2")).toEqual({ column: 1, columnCount: 2 });
    expect(mixed.get("m3")).toEqual({ column: 0, columnCount: 2 });
    // Afternoon plan is not in the same cluster, so it has columnCount 1 (full width)
    expect(mixed.get("afternoon")).toEqual({ column: 0, columnCount: 1 });

    // Contiguous plans (no overlap)
    const contiguous = layoutPlanColumns([
      { id: "c1", startTime: "09:00", endTime: "10:00" },
      { id: "c2", startTime: "10:00", endTime: "11:00" },
    ]);
    expect(contiguous.get("c1")).toEqual({ column: 0, columnCount: 1 });
    expect(contiguous.get("c2")).toEqual({ column: 0, columnCount: 1 });
  });
});

