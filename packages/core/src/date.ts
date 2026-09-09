// Date helpers. All functions operate on local time to avoid timezone drift
// with YYYY-MM-DD strings.

import type { Task } from "./types";

export const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Build a local YYYY-MM-DD string from a Date. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a YYYY-MM-DD string into a local Date (midnight). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Monday-based start of week. */
export function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function formatDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatDateShort(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateFull(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAY_CN[d.getDay()]}`;
}

export function weekdayCN(d: Date): string {
  return `周${WEEKDAY_CN[d.getDay()]}`;
}

export function monthLabel(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export function relativeRangeLabel(startISO: string, endISO: string): string {
  return `${formatDateShort(startISO)} - ${formatDateShort(endISO)}`;
}

// ---- Time helpers -----------------------------------------------------------

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatTime(hhmm: string): string {
  const total = timeToMinutes(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? "上午" : "下午";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${suffix} ${h12}:${pad(m)}`;
}

export function formatDurationMinutes(min: number): string {
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} 小时` : `${h} 小时 ${m} 分钟`;
}

export function isTimeRangeValid(start: string, end: string): boolean {
  return timeToMinutes(end) > timeToMinutes(start);
}

/** Whether a YYYY-MM-DD falls within an inclusive [start, end] range. */
export function inDateRange(iso: string, startISO: string, endISO: string): boolean {
  return iso >= startISO && iso <= endISO;
}

export interface PlanColumnLayout {
  column: number;
  columnCount: number;
}

/**
 * Layout overlapping daily plans into horizontal columns using cluster grouping.
 * Plans that overlap with each other share the available width equally.
 */
export function layoutPlanColumns<T extends { id: string; startTime: string; endTime: string }>(
  plans: T[],
): Map<string, PlanColumnLayout> {
  const layouts = new Map<string, PlanColumnLayout>();
  if (plans.length === 0) return layouts;

  const sorted = [...plans].sort((a, b) => {
    const startDiff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (startDiff !== 0) return startDiff;
    return timeToMinutes(b.endTime) - timeToMinutes(a.endTime);
  });

  const clusters: T[][] = [];
  let currentCluster: T[] = [];
  let clusterEnd = -1;

  for (const plan of sorted) {
    const start = timeToMinutes(plan.startTime);
    const end = timeToMinutes(plan.endTime);

    if (currentCluster.length === 0 || start < clusterEnd) {
      currentCluster.push(plan);
      clusterEnd = Math.max(clusterEnd, end);
    } else {
      clusters.push(currentCluster);
      currentCluster = [plan];
      clusterEnd = end;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  for (const cluster of clusters) {
    const columns: T[][] = [];

    for (const plan of cluster) {
      const start = timeToMinutes(plan.startTime);
      const reusableColumn = columns.findIndex((items) => {
        const previous = items[items.length - 1];
        return previous ? timeToMinutes(previous.endTime) <= start : false;
      });

      const columnIndex = reusableColumn === -1 ? columns.length : reusableColumn;
      if (!columns[columnIndex]) columns[columnIndex] = [];
      columns[columnIndex].push(plan);
    }

    const columnCount = columns.length;
    columns.forEach((items, column) => {
      items.forEach((plan) => {
        layouts.set(plan.id, { column, columnCount });
      });
    });
  }

  return layouts;
}

/** 42-day Monday-first month grid (6 weeks) for a given anchor date. */
export function monthGridDays(anchor: Date): Date[] {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export interface MonthWeekTaskSegment {
  task: Task;
  startCol: number; // 0..6 (Mon=0, Sun=6)
  endCol: number; // 0..6 (Mon=0, Sun=6)
  isStart: boolean; // whether the task starts within this week
  isEnd: boolean; // whether the task ends within this week
  trackIndex: number; // 0-based vertical track index
}

/**
 * Lays out tasks that overlap a 7-day week (Monday to Sunday) into horizontal
 * non-overlapping tracks.
 */
export function layoutMonthWeekTasks(
  tasks: Task[],
  week: Date[],
): MonthWeekTaskSegment[] {
  if (tasks.length === 0 || week.length !== 7) return [];

  const weekStartISO = toISODate(week[0]);
  const weekEndISO = toISODate(week[6]);

  // Find all tasks overlapping this week
  const rawSegments: Omit<MonthWeekTaskSegment, "trackIndex">[] = [];

  for (const task of tasks) {
    const rawStart = task.startDate <= task.endDate ? task.startDate : task.endDate;
    const rawEnd = task.startDate <= task.endDate ? task.endDate : task.startDate;

    if (rawEnd < weekStartISO || rawStart > weekEndISO) {
      continue;
    }

    const segStartISO = rawStart < weekStartISO ? weekStartISO : rawStart;
    const segEndISO = rawEnd > weekEndISO ? weekEndISO : rawEnd;

    const startCol = Math.max(
      0,
      Math.min(
        6,
        Math.round(
          (parseISODate(segStartISO).getTime() - parseISODate(weekStartISO).getTime()) /
            DAY_MS,
        ),
      ),
    );
    const endCol = Math.max(
      startCol,
      Math.min(
        6,
        Math.round(
          (parseISODate(segEndISO).getTime() - parseISODate(weekStartISO).getTime()) /
            DAY_MS,
        ),
      ),
    );

    const isStart = rawStart >= weekStartISO;
    const isEnd = rawEnd <= weekEndISO;

    rawSegments.push({
      task,
      startCol,
      endCol,
      isStart,
      isEnd,
    });
  }

  // Sort segments:
  // 1. Earlier startCol first
  // 2. Longer span (endCol - startCol) first (anchors longer bars on lower tracks)
  // 3. Earlier task.startDate first
  // 4. Stable by task.id
  rawSegments.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    const spanA = a.endCol - a.startCol;
    const spanB = b.endCol - b.startCol;
    if (spanA !== spanB) return spanB - spanA;
    if (a.task.startDate !== b.task.startDate) {
      return a.task.startDate.localeCompare(b.task.startDate);
    }
    return a.task.id.localeCompare(b.task.id);
  });

  // Greedy track allocation (interval scheduling)
  const trackEnds: number[] = [];
  const segments: MonthWeekTaskSegment[] = [];

  for (const seg of rawSegments) {
    let assignedTrack = -1;
    for (let t = 0; t < trackEnds.length; t++) {
      if (trackEnds[t] < seg.startCol) {
        assignedTrack = t;
        trackEnds[t] = seg.endCol;
        break;
      }
    }
    if (assignedTrack === -1) {
      assignedTrack = trackEnds.length;
      trackEnds.push(seg.endCol);
    }

    segments.push({
      ...seg,
      trackIndex: assignedTrack,
    });
  }

  return segments;
}

