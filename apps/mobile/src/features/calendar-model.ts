import {
  DAY_MS,
  addDays,
  formatDate,
  formatDateFull,
  layoutPlanColumns,
  monthLabel,
  parseISODate,
  startOfWeek,
  timeToMinutes,
  toISODate,
  weekDays,
  type DailyPlan,
  type PlanColumnLayout,
  type Task,
} from "@task-orbit/core";

export type CalendarMode = "day" | "week" | "month";
export type WeekCalendarMode = "gantt" | "plans";

export type { PlanColumnLayout };
export { layoutPlanColumns };

export interface TaskWeekRange {
  startIndex: number;
  endIndex: number;
}

export function calendarHeading(mode: CalendarMode, anchor: Date): string {
  if (mode === "month") return monthLabel(anchor);
  if (mode === "day") return formatDateFull(toISODate(anchor));
  const days = weekDays(anchor);
  return `${formatDate(toISODate(days[0]))} - ${formatDate(toISODate(days[6]))}`;
}

export function monthGridDays(anchor: Date): Date[] {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function taskRangeInWeek(task: Pick<Task, "startDate" | "endDate">, anchor: Date): TaskWeekRange | null {
  const weekStart = startOfWeek(anchor);
  const weekEnd = addDays(weekStart, 6);
  const start = parseISODate(task.startDate);
  const end = parseISODate(task.endDate);
  if (end < weekStart || start > weekEnd) return null;

  const visibleStart = start > weekStart ? start : weekStart;
  const visibleEnd = end < weekEnd ? end : weekEnd;
  return {
    startIndex: Math.round((visibleStart.getTime() - weekStart.getTime()) / DAY_MS),
    endIndex: Math.round((visibleEnd.getTime() - weekStart.getTime()) / DAY_MS),
  };
}

export function visibleHourRange(plans: Pick<DailyPlan, "startTime" | "endTime">[]): { startHour: number; endHour: number } {
  const earliest = plans.length > 0 ? Math.min(...plans.map((plan) => timeToMinutes(plan.startTime))) : 8 * 60;
  const latest = plans.length > 0 ? Math.max(...plans.map((plan) => timeToMinutes(plan.endTime))) : 18 * 60;
  return {
    startHour: Math.max(0, Math.min(6, Math.floor(earliest / 60))),
    endHour: Math.min(24, Math.max(22, Math.ceil(latest / 60))),
  };
}
