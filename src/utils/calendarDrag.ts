import { timeToMinutes, toISODate } from "@task-orbit/core";

export type PlanDragMode = "move" | "resize-top" | "resize-bottom";

export interface ComputeDraggedTimesOptions {
  mode: PlanDragMode;
  origStartTime: string;
  origEndTime: string;
  deltaY: number;
  hourHeight: number;
  minHour?: number;
  maxHour?: number;
  snapStepMinutes?: number;
  minDurationMinutes?: number;
}

export interface ComputedPlanTimes {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
}

/**
 * 将分钟数对齐到指定步长（默认 15 分钟）
 */
export function snapMinutes(minutes: number, step = 15): number {
  if (step <= 0) return Math.round(minutes);
  return Math.round(minutes / step) * step;
}

/**
 * 将分钟数转为标准 HH:mm 格式，针对结束时间边界（>= 1440）自动转为 23:59
 */
export function minutesToHHMM(minutes: number, isEndTime = false): string {
  if (isEndTime && minutes >= 1440) {
    return "23:59";
  }
  const clamped = Math.max(0, Math.min(1439, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 计算拖动/缩放后的计划起止时间，包含边界截断与最小持续时长保证
 */
export function computeDraggedPlanTimes({
  mode,
  origStartTime,
  origEndTime,
  deltaY,
  hourHeight,
  minHour = 6,
  maxHour = 24,
  snapStepMinutes = 15,
  minDurationMinutes = 15,
}: ComputeDraggedTimesOptions): ComputedPlanTimes {
  const deltaMinutes = snapMinutes((deltaY / hourHeight) * 60, snapStepMinutes);
  const origStartMinutes = timeToMinutes(origStartTime);
  const origEndMinutes = timeToMinutes(origEndTime);
  const minAllowedMinutes = minHour * 60;
  const maxAllowedMinutes = maxHour * 60;

  if (mode === "move") {
    const duration = Math.max(minDurationMinutes, origEndMinutes - origStartMinutes);
    const rawStart = origStartMinutes + deltaMinutes;
    const minStart = minAllowedMinutes;
    const maxStart = Math.max(minStart, maxAllowedMinutes - duration);
    const startMinutes = Math.max(minStart, Math.min(maxStart, rawStart));
    const endMinutes = startMinutes + duration;

    return {
      startTime: minutesToHHMM(startMinutes, false),
      endTime: minutesToHHMM(endMinutes, true),
      startMinutes,
      endMinutes,
    };
  }

  if (mode === "resize-top") {
    const rawStart = origStartMinutes + deltaMinutes;
    const maxStart = origEndMinutes - minDurationMinutes;
    const minStart = minAllowedMinutes;
    const startMinutes = Math.max(minStart, Math.min(maxStart, rawStart));

    return {
      startTime: minutesToHHMM(startMinutes, false),
      endTime: origEndTime,
      startMinutes,
      endMinutes: origEndMinutes,
    };
  }

  // resize-bottom
  const rawEnd = origEndMinutes + deltaMinutes;
  const minEnd = origStartMinutes + minDurationMinutes;
  const maxEnd = maxAllowedMinutes;
  const endMinutes = Math.max(minEnd, Math.min(maxEnd, rawEnd));

  return {
    startTime: origStartTime,
    endTime: minutesToHHMM(endMinutes, true),
    startMinutes: origStartMinutes,
    endMinutes,
  };
}

/**
 * 周视图下根据水平光标位置计算目标列与日期
 */
export function computeTargetDayFromX(
  clientX: number,
  containerRect: { left: number; width: number },
  days: Date[],
): { targetDay: Date; targetDate: string; dayIndex: number } {
  if (days.length === 0) {
    const now = new Date();
    return { targetDay: now, targetDate: toISODate(now), dayIndex: 0 };
  }
  const colWidth = containerRect.width / days.length;
  const relX = clientX - containerRect.left;
  const rawIdx = Math.floor(relX / colWidth);
  const dayIndex = Math.max(0, Math.min(days.length - 1, rawIdx));
  const targetDay = days[dayIndex];
  return {
    targetDay,
    targetDate: toISODate(targetDay),
    dayIndex,
  };
}
