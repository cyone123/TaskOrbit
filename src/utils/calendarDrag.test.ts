import { describe, expect, it } from "vitest";
import {
  computeDraggedPlanTimes,
  computeTargetDayFromX,
  minutesToHHMM,
  snapMinutes,
} from "./calendarDrag";

describe("calendarDrag utils", () => {
  describe("snapMinutes", () => {
    it("snaps to nearest 15 minute interval", () => {
      expect(snapMinutes(0)).toBe(0);
      expect(snapMinutes(7)).toBe(0);
      expect(snapMinutes(8)).toBe(15);
      expect(snapMinutes(15)).toBe(15);
      expect(snapMinutes(22)).toBe(15);
      expect(snapMinutes(23)).toBe(30);
      expect(snapMinutes(55)).toBe(60);
    });
  });

  describe("minutesToHHMM", () => {
    it("formats standard minutes correctly", () => {
      expect(minutesToHHMM(0)).toBe("00:00");
      expect(minutesToHHMM(360)).toBe("06:00");
      expect(minutesToHHMM(570)).toBe("09:30");
      expect(minutesToHHMM(1439)).toBe("23:59");
    });

    it("clamps end time to 23:59 when 24:00 (1440) is reached", () => {
      expect(minutesToHHMM(1440, true)).toBe("23:59");
      expect(minutesToHHMM(1500, true)).toBe("23:59");
    });

    it("clamps negative minutes to 00:00", () => {
      expect(minutesToHHMM(-30)).toBe("00:00");
    });
  });

  describe("computeDraggedPlanTimes - move", () => {
    it("moves plan forward by 1 hour (44px)", () => {
      const result = computeDraggedPlanTimes({
        mode: "move",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 44,
        hourHeight: 44,
      });
      expect(result.startTime).toBe("10:00");
      expect(result.endTime).toBe("11:00");
    });

    it("moves plan by 15 minutes (11px)", () => {
      const result = computeDraggedPlanTimes({
        mode: "move",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 11,
        hourHeight: 44,
      });
      expect(result.startTime).toBe("09:15");
      expect(result.endTime).toBe("10:15");
    });

    it("clamps to top boundary (06:00)", () => {
      const result = computeDraggedPlanTimes({
        mode: "move",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: -500,
        hourHeight: 44,
        minHour: 6,
      });
      expect(result.startTime).toBe("06:00");
      expect(result.endTime).toBe("07:00");
    });

    it("clamps to bottom boundary (23:59)", () => {
      const result = computeDraggedPlanTimes({
        mode: "move",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 1000,
        hourHeight: 44,
        maxHour: 24,
      });
      expect(result.startTime).toBe("23:00");
      expect(result.endTime).toBe("23:59");
    });

    it("preserves non-standard durations", () => {
      const result = computeDraggedPlanTimes({
        mode: "move",
        origStartTime: "09:00",
        origEndTime: "09:45",
        deltaY: 44,
        hourHeight: 44,
      });
      expect(result.startTime).toBe("10:00");
      expect(result.endTime).toBe("10:45");
    });
  });

  describe("computeDraggedPlanTimes - resize-top", () => {
    it("adjusts start time while keeping end time fixed", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-top",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 22,
        hourHeight: 44,
      });
      expect(result.startTime).toBe("09:30");
      expect(result.endTime).toBe("10:00");
    });

    it("enforces minimum duration of 15 minutes when dragging top downwards", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-top",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 100, // dragged past the end
        hourHeight: 44,
      });
      expect(result.startTime).toBe("09:45");
      expect(result.endTime).toBe("10:00");
    });

    it("clamps start time to top grid boundary (06:00)", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-top",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: -300,
        hourHeight: 44,
        minHour: 6,
      });
      expect(result.startTime).toBe("06:00");
      expect(result.endTime).toBe("10:00");
    });
  });

  describe("computeDraggedPlanTimes - resize-bottom", () => {
    it("adjusts end time while keeping start time fixed", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-bottom",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 22,
        hourHeight: 44,
      });
      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("10:30");
    });

    it("enforces minimum duration of 15 minutes when dragging bottom upwards", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-bottom",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: -100, // dragged above start time
        hourHeight: 44,
      });
      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("09:15");
    });

    it("clamps end time to bottom grid boundary (23:59)", () => {
      const result = computeDraggedPlanTimes({
        mode: "resize-bottom",
        origStartTime: "09:00",
        origEndTime: "10:00",
        deltaY: 1000,
        hourHeight: 44,
        maxHour: 24,
      });
      expect(result.startTime).toBe("09:00");
      expect(result.endTime).toBe("23:59");
    });
  });

  describe("computeTargetDayFromX", () => {
    const mockDays = [
      new Date(2026, 8, 7),
      new Date(2026, 8, 8),
      new Date(2026, 8, 9),
      new Date(2026, 8, 10),
      new Date(2026, 8, 11),
      new Date(2026, 8, 12),
      new Date(2026, 8, 13),
    ];
    const containerRect = { left: 100, width: 700 }; // each column is 100px wide

    it("detects first day column", () => {
      const result = computeTargetDayFromX(120, containerRect, mockDays);
      expect(result.dayIndex).toBe(0);
      expect(result.targetDate).toBe("2026-09-07");
    });

    it("detects middle day column", () => {
      const result = computeTargetDayFromX(350, containerRect, mockDays);
      expect(result.dayIndex).toBe(2);
      expect(result.targetDate).toBe("2026-09-09");
    });

    it("clamps when dragged beyond left edge", () => {
      const result = computeTargetDayFromX(50, containerRect, mockDays);
      expect(result.dayIndex).toBe(0);
    });

    it("clamps when dragged beyond right edge", () => {
      const result = computeTargetDayFromX(900, containerRect, mockDays);
      expect(result.dayIndex).toBe(6);
      expect(result.targetDate).toBe("2026-09-13");
    });
  });
});
