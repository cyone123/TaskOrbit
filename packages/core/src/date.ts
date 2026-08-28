// Date helpers. All functions operate on local time to avoid timezone drift
// with YYYY-MM-DD strings.

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
