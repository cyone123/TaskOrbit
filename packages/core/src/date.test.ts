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
  layoutMonthWeekTasks,
  layoutPlanColumns,
  minutesToTime,
  monthGridDays,
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

  it("generates a 42-day month grid starting on Monday", () => {
    const days = monthGridDays(new Date(2026, 8, 15)); // Sep 2026
    expect(days.length).toBe(42);
    // Sep 1, 2026 is a Tuesday. The Monday start should be Aug 31, 2026.
    expect(toISODate(days[0])).toBe("2026-08-31");
    expect(toISODate(days[41])).toBe("2026-10-11");
  });

  it("handles layoutMonthWeekTasks with various span and overlap scenarios", () => {
    // Week: 2026-09-07 (Mon) to 2026-09-13 (Sun)
    const week = weekDays(new Date(2026, 8, 7));
    expect(toISODate(week[0])).toBe("2026-09-07");
    expect(toISODate(week[6])).toBe("2026-09-13");

    // Helper task creator
    const makeTask = (id: string, start: string, end: string) => ({
      id,
      name: `Task ${id}`,
      description: "",
      projectId: "p1",
      startDate: start,
      endDate: end,
      done: false,
      priority: "medium" as const,
      createdAt: 0,
      updatedAt: 0,
    });

    // 1. Empty tasks or invalid week
    expect(layoutMonthWeekTasks([], week)).toEqual([]);
    expect(layoutMonthWeekTasks([makeTask("1", "2026-09-07", "2026-09-08")], [])).toEqual([]);

    // 2. Task strictly outside the week
    const outsideTasks = [
      makeTask("out-before", "2026-09-01", "2026-09-06"),
      makeTask("out-after", "2026-09-14", "2026-09-20"),
    ];
    expect(layoutMonthWeekTasks(outsideTasks, week)).toEqual([]);

    // 3. Single-day task
    const singleDay = layoutMonthWeekTasks(
      [makeTask("single", "2026-09-09", "2026-09-09")],
      week,
    );
    expect(singleDay).toHaveLength(1);
    expect(singleDay[0]).toMatchObject({
      startCol: 2, // Wednesday = col 2
      endCol: 2,
      isStart: true,
      isEnd: true,
      trackIndex: 0,
    });

    // 4. Spanning from previous week into this week
    const fromPast = layoutMonthWeekTasks(
      [makeTask("past", "2026-09-01", "2026-09-08")], // ends on Tuesday
      week,
    );
    expect(fromPast[0]).toMatchObject({
      startCol: 0,
      endCol: 1, // Mon=0, Tue=1
      isStart: false,
      isEnd: true,
      trackIndex: 0,
    });

    // 5. Spanning from this week into next week
    const toFuture = layoutMonthWeekTasks(
      [makeTask("future", "2026-09-11", "2026-09-18")], // starts Friday (col 4)
      week,
    );
    expect(toFuture[0]).toMatchObject({
      startCol: 4,
      endCol: 6,
      isStart: true,
      isEnd: false,
      trackIndex: 0,
    });

    // 6. Spanning across the entire week
    const wholeWeek = layoutMonthWeekTasks(
      [makeTask("all", "2026-09-01", "2026-09-20")],
      week,
    );
    expect(wholeWeek[0]).toMatchObject({
      startCol: 0,
      endCol: 6,
      isStart: false,
      isEnd: false,
      trackIndex: 0,
    });

    // 7. Non-overlapping tasks share the same track (track 0)
    // Task A: Mon-Wed (col 0-2), Task B: Thu-Sun (col 3-6)
    const nonOverlapping = layoutMonthWeekTasks(
      [
        makeTask("a", "2026-09-07", "2026-09-09"),
        makeTask("b", "2026-09-10", "2026-09-13"),
      ],
      week,
    );
    expect(nonOverlapping).toHaveLength(2);
    expect(nonOverlapping[0].trackIndex).toBe(0);
    expect(nonOverlapping[1].trackIndex).toBe(0);

    // 8. Overlapping tasks assigned to different tracks
    // Task A: Mon-Wed (col 0-2)
    // Task B: Tue-Thu (col 1-3) -> overlaps with A on Tue/Wed, goes to track 1
    // Task C: Thu-Fri (col 3-4) -> col 3 overlaps with B, but free on track 0!
    const overlapping = layoutMonthWeekTasks(
      [
        makeTask("a", "2026-09-07", "2026-09-09"),
        makeTask("b", "2026-09-08", "2026-09-10"),
        makeTask("c", "2026-09-10", "2026-09-11"),
      ],
      week,
    );
    const segA = overlapping.find((s) => s.task.id === "a")!;
    const segB = overlapping.find((s) => s.task.id === "b")!;
    const segC = overlapping.find((s) => s.task.id === "c")!;

    expect(segA.trackIndex).toBe(0);
    expect(segB.trackIndex).toBe(1);
    // Track 0 was freed after Wednesday (col 2), so Task C (starting col 3) reuses track 0
    expect(segC.trackIndex).toBe(0);
  });
});

