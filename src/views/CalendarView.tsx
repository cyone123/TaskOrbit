import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { DailyPlanForm, TaskForm } from "../components/forms";
import {
  Checkbox,
  FilledCard,
  IconButton,
  OutlinedCard,
  OutlinedSegmentedButton,
  OutlinedSegmentedButtonSet,
  TonalButton,
} from "../components/material";
import { ConfirmDialog, Dialog, useSnackbar } from "../components/ui";
import { colorByKey, contrastText } from "../store/colors";
import { dailyPlanRepeatLabel } from "../store/recurrence";
import { useStore } from "../store/store";
import type { DailyPlan, Task } from "../types";
import {
  DAY_MS,
  addDays,
  formatDate,
  formatDateFull,
  isToday,
  isWeekend,
  monthLabel,
  parseISODate,
  startOfWeek,
  timeToMinutes,
  toISODate,
  weekDays,
  weekdayCN,
} from "../utils/date";

const HOUR_HEIGHT = 44;
const DAY_MINUTES = 24 * 60;
const WEEK_DETAIL_START_HOUR = 6;
const WEEK_DETAIL_END_HOUR = 24;

type CalendarMode = "month" | "week" | "day";
type WeekViewMode = "gantt" | "detail";

interface BarRange {
  startIdx: number;
  endIdx: number;
}

interface PlanLayout {
  column: number;
  columnCount: number;
}

function layoutPlans(plans: DailyPlan[]): Map<string, PlanLayout> {
  const columns: DailyPlan[][] = [];
  const layouts = new Map<string, PlanLayout>();

  const sorted = [...plans].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  for (const plan of sorted) {
    const start = timeToMinutes(plan.startTime);
    const column = columns.findIndex((items) => {
      const previous = items[items.length - 1];
      return previous && timeToMinutes(previous.endTime) <= start;
    });
    const columnIndex = column === -1 ? columns.length : column;
    if (!columns[columnIndex]) columns[columnIndex] = [];
    columns[columnIndex].push(plan);
  }

  for (const items of columns) {
    for (const plan of items) {
      layouts.set(plan.id, {
        column: columns.findIndex((column) => column.includes(plan)),
        columnCount: columns.length,
      });
    }
  }
  return layouts;
}

function monthGridDays(anchor: Date): Date[] {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function CalendarView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();

  const [mode, setMode] = useState<CalendarMode>("week");
  const [weekView, setWeekView] = useState<WeekViewMode>("gantt");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const contentRef = useRef<HTMLDivElement>(null);

  const [taskForm, setTaskForm] = useState<{
    open: boolean;
    projectId: string;
    editing: Task | null;
  }>({ open: false, projectId: "", editing: null });
  const [planForm, setPlanForm] = useState<{
    open: boolean;
    projectId: string | null;
    taskId: string | null;
    lockProject: boolean;
    lockTask: boolean;
    defaultDate?: string;
    editing: DailyPlan | null;
  }>({
    open: false,
    projectId: null,
    taskId: null,
    lockProject: false,
    lockTask: false,
    editing: null,
  });
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const days = useMemo(() => weekDays(anchor), [anchor]);
  const selectedISO = toISODate(anchor);
  const monthDays = useMemo(() => monthGridDays(anchor), [anchor]);
  const monthStart = useMemo(
    () => new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    [anchor],
  );
  const projectById = useMemo(() => {
    return new Map(state.projects.map((project) => [project.id, project]));
  }, [state.projects]);

  const tasksInWeek = useMemo(() => {
    const weekStart = startOfWeek(anchor);
    const weekEnd = addDays(weekStart, 6);
    return state.tasks
      .filter(
        (task) =>
          parseISODate(task.endDate) >= weekStart &&
          parseISODate(task.startDate) <= weekEnd,
      )
      .sort((a, b) => {
        const projectA = projectById.get(a.projectId)?.startDate ?? "";
        const projectB = projectById.get(b.projectId)?.startDate ?? "";
        if (projectA !== projectB) return projectA < projectB ? -1 : 1;
        return a.startDate < b.startDate
          ? -1
          : a.startDate > b.startDate
            ? 1
            : a.name.localeCompare(b.name);
      });
  }, [state.tasks, anchor, projectById]);

  const plansOfDay = useMemo(() => {
    return state.dailyPlans
      .filter((plan) => plan.date === selectedISO)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [state.dailyPlans, selectedISO]);

  const tasksOfDay = useMemo(() => {
    return state.tasks.filter(
      (task) => task.startDate <= selectedISO && task.endDate >= selectedISO,
    );
  }, [state.tasks, selectedISO]);

  const plansOfWeek = useMemo(
    () =>
      days.map((day) =>
        state.dailyPlans
          .filter((plan) => plan.date === toISODate(day))
          .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)),
      ),
    [days, state.dailyPlans],
  );

  const layoutsOfWeek = useMemo(
    () => plansOfWeek.map((plans) => layoutPlans(plans)),
    [plansOfWeek],
  );

  const monthTasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    const gridStart = monthDays[0];
    const gridEnd = monthDays[monthDays.length - 1];

    state.tasks
      .filter(
        (task) =>
          parseISODate(task.endDate) >= gridStart &&
          parseISODate(task.startDate) <= gridEnd,
      )
      .forEach((task) => {
        const start = parseISODate(task.startDate) < gridStart
          ? gridStart
          : parseISODate(task.startDate);
        const date = toISODate(start);
        map.set(date, [...(map.get(date) ?? []), task]);
      });

    return map;
  }, [monthDays, state.tasks]);

  useEffect(() => {
    if (mode === "day") {
      contentRef.current?.parentElement?.scrollTo({ top: 8 * HOUR_HEIGHT - 60 });
    }
  }, [mode, anchor]);

  const colorForProject = (projectId: string | null): string => {
    const project = projectId ? projectById.get(projectId) : null;
    return project ? colorByKey(project.color) : "#79747e";
  };

  const rangeFor = (task: Task): BarRange | null => {
    const weekStart = startOfWeek(anchor);
    const start = parseISODate(task.startDate);
    const end = parseISODate(task.endDate);
    const weekEnd = addDays(weekStart, 6);
    if (end < weekStart || start > weekEnd) return null;
    const visibleStart = start > weekStart ? start : weekStart;
    const visibleEnd = end < weekEnd ? end : weekEnd;
    return {
      startIdx: Math.round(
        (visibleStart.getTime() - weekStart.getTime()) / DAY_MS,
      ),
      endIdx: Math.round((visibleEnd.getTime() - weekStart.getTime()) / DAY_MS),
    };
  };

  const navigate = (direction: number) => {
    setAnchor((current) => {
      if (mode === "month") {
        return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      }
      return addDays(current, mode === "week" ? direction * 7 : direction);
    });
  };

  const goToday = () => setAnchor(new Date());

  const openTaskEditor = (task: Task) =>
    setTaskForm({ open: true, projectId: task.projectId, editing: task });

  const openPlanEditor = (plan: DailyPlan) =>
    setPlanForm({
      open: true,
      projectId: plan.projectId,
      taskId: plan.taskId,
      lockProject: true,
      lockTask: true,
      editing: plan,
    });

  const openNewPlan = (date = selectedISO) =>
    setPlanForm({
      open: true,
      projectId: null,
      taskId: null,
      lockProject: false,
      lockTask: false,
      defaultDate: date,
      editing: null,
    });

  const askDeletePlan = (plan: DailyPlan) =>
    setConfirm({
      open: true,
      title: "删除计划",
      message: `确定删除计划「${plan.name}」吗？`,
      onConfirm: () => {
        store.deleteDailyPlan(plan.id);
        setConfirm((current) => ({ ...current, open: false }));
        show("计划已删除");
      },
    });

  const heading =
    mode === "month"
      ? monthLabel(anchor)
      : mode === "week"
        ? `${formatDate(toISODate(days[0]))} - ${formatDate(toISODate(days[6]))}`
        : formatDateFull(selectedISO);

  return (
    <div ref={contentRef} className="calendar-view" style={{ maxWidth: 1180 }}>
      <div className="spread mb-16 calendar-toolbar">
        <div className="row gap-8 calendar-toolbar__navigation">
          <IconButton onClick={() => navigate(-1)} aria-label="上一页" title="上一页">
            <Icon name="chevron_left" />
          </IconButton>
          <IconButton onClick={() => navigate(1)} aria-label="下一页" title="下一页">
            <Icon name="chevron_right" />
          </IconButton>
          <TonalButton className="compact-action" onClick={goToday}>
            今天
          </TonalButton>
          <span className="title-lg calendar-heading">{heading}</span>
        </div>

        <div className="row gap-8 calendar-toolbar__actions">
          <TonalButton onClick={() => openNewPlan()}>
            <Icon name="add" size={18} slot="icon" /> 添加计划
          </TonalButton>
          {mode === "week" && (
            <OutlinedSegmentedButtonSet className="segmented-control calendar-submode-switcher">
              <OutlinedSegmentedButton
                label="甘特图"
                selected={weekView === "gantt"}
                onClick={() => setWeekView("gantt")}
              >
                <Icon name="timeline" size={16} slot="icon" />
              </OutlinedSegmentedButton>
              <OutlinedSegmentedButton
                label="每日计划"
                selected={weekView === "detail"}
                onClick={() => setWeekView("detail")}
              >
                <Icon name="calendar_view_day" size={16} slot="icon" />
              </OutlinedSegmentedButton>
            </OutlinedSegmentedButtonSet>
          )}
          <OutlinedSegmentedButtonSet className="segmented-control calendar-view-switcher">
            <OutlinedSegmentedButton
              label="月"
              selected={mode === "month"}
              onClick={() => setMode("month")}
            >
              <Icon name="calendar_month" size={16} slot="icon" />
            </OutlinedSegmentedButton>
            <OutlinedSegmentedButton
              label="周"
              selected={mode === "week"}
              onClick={() => setMode("week")}
            >
              <Icon name="view_week" size={16} slot="icon" />
            </OutlinedSegmentedButton>
            <OutlinedSegmentedButton
              label="日"
              selected={mode === "day"}
              onClick={() => setMode("day")}
            >
              <Icon name="view_day" size={16} slot="icon" />
            </OutlinedSegmentedButton>
          </OutlinedSegmentedButtonSet>
        </div>
      </div>

      {mode === "month" && (
        <div className="month-calendar">
          <div className="month-calendar__weekdays">
            {days.map((day) => (
              <div key={weekdayCN(day)} className="month-calendar__weekday">
                {weekdayCN(day)}
              </div>
            ))}
          </div>
          <div className="month-calendar__grid">
            {monthDays.map((day) => {
              const iso = toISODate(day);
              const dayPlans = state.dailyPlans
                .filter((plan) => plan.date === iso)
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
              const dayTasks = monthTasksByDate.get(iso) ?? [];
              const events = [
                ...dayTasks.map((task) => ({ type: "task" as const, item: task })),
                ...dayPlans.map((plan) => ({ type: "plan" as const, item: plan })),
              ];
              const visibleEvents = events.slice(0, 4);
              const hiddenCount = events.length - visibleEvents.length;
              const inCurrentMonth = day.getMonth() === monthStart.getMonth();

              return (
                <div
                  key={iso}
                  className={`month-calendar__cell ${inCurrentMonth ? "" : "outside"} ${isToday(iso) ? "today" : ""} ${isWeekend(day) ? "weekend" : ""}`}
                >
                  <button
                    type="button"
                    className="month-calendar__date"
                    onClick={() => {
                      setAnchor(day);
                      setMode("day");
                    }}
                    aria-label={`查看${formatDateFull(iso)}`}
                  >
                    {day.getDate()}
                  </button>
                  <div className="month-calendar__events">
                    {visibleEvents.map((event) => {
                      if (event.type === "task") {
                        const task = event.item;
                        const color = colorForProject(task.projectId);
                        return (
                          <button
                            key={`task-${task.id}`}
                            type="button"
                            className="month-event month-event--task"
                            style={{ borderLeftColor: color, background: `${color}22` }}
                            onClick={() => openTaskEditor(task)}
                            title={`${task.name} · ${task.startDate} ~ ${task.endDate}`}
                          >
                            <span className="month-event__dot" style={{ background: color }} />
                            <span className="ellipsis">{task.name}</span>
                          </button>
                        );
                      }

                      const plan = event.item;
                      const color = colorForProject(plan.projectId);
                      return (
                        <button
                          key={`plan-${plan.id}`}
                          type="button"
                          className="month-event month-event--plan"
                          style={{ background: color, color: contrastText(color) }}
                          onClick={() => openPlanEditor(plan)}
                          title={`${plan.name} · ${plan.startTime} - ${plan.endTime}`}
                        >
                          <span className="ellipsis">{plan.name}</span>
                          <span className="month-event__time">· {plan.startTime}</span>
                        </button>
                      );
                    })}
                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        className="month-calendar__more"
                        onClick={() => {
                          setAnchor(day);
                          setMode("day");
                        }}
                      >
                        还有 {hiddenCount} 项
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "week" && weekView === "gantt" && (
        <div className="gantt">
          <div className="gantt-head">
            <div className="gantt-gutter">任务 / 项目</div>
            <div className="gantt-head__track">
              {days.map((day) => {
                const iso = toISODate(day);
                const count = state.dailyPlans.filter((plan) => plan.date === iso).length;
                return (
                  <div
                    key={iso}
                    className={`gantt-dayhead ${isToday(iso) ? "today" : ""} ${isWeekend(day) ? "weekend" : ""}`}
                    onClick={() => {
                      setAnchor(day);
                      setMode("day");
                    }}
                    title="切换到日视图"
                  >
                    <div className="label-sm">{weekdayCN(day)}</div>
                    <div className="num">{day.getDate()}</div>
                    <div className="body-sm" style={{ fontSize: 11 }}>
                      {count > 0 ? `${count} 项计划` : "\u00A0"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {tasksInWeek.length === 0 ? (
            <div className="empty">
              <Icon name="event_busy" size={48} />
              <div className="title-md">本周没有任务</div>
            </div>
          ) : (
            tasksInWeek.map((task) => {
              const range = rangeFor(task);
              const color = colorForProject(task.projectId);
              const left = range ? (range.startIdx / 7) * 100 : 0;
              const width = range
                ? ((range.endIdx - range.startIdx + 1) / 7) * 100
                : 0;
              const project = projectById.get(task.projectId);
              return (
                <div className="gantt-row" key={task.id}>
                  <div
                    className="gantt-gutter"
                    style={{ cursor: "pointer" }}
                    onClick={() => openTaskEditor(task)}
                  >
                    <div className="col" style={{ minWidth: 0 }}>
                      <div className="row gap-8">
                        <span className="dot" style={{ background: color }} />
                        <span
                          className="body-md ellipsis"
                          style={{ textDecoration: task.done ? "line-through" : "none" }}
                        >
                          {task.name}
                        </span>
                      </div>
                      <div className="body-sm muted ellipsis">{project?.name ?? "独立"}</div>
                    </div>
                  </div>
                  <div className="gantt-row__track">
                    <div className="gantt-row__days">
                      {days.map((day) => (
                        <div key={toISODate(day)} />
                      ))}
                    </div>
                    {range && (
                      <div
                        className="gantt-bar"
                        style={{
                          left: `calc(${left}% + 3px)`,
                          width: `calc(${width}% - 6px)`,
                          background: color,
                          color: contrastText(color),
                          top: 8,
                        }}
                        onClick={() => openTaskEditor(task)}
                        title={`${task.name} · ${task.startDate} ~ ${task.endDate}`}
                      >
                        {task.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {mode === "week" && weekView === "detail" && (
        <div className="calendar-horizontal-scroll">
          <div className="week-detail">
            <div className="week-detail__head">
              <div className="week-detail__time-label">时间</div>
              {days.map((day) => {
                const iso = toISODate(day);
                return (
                  <button
                    key={iso}
                    type="button"
                    className={`week-detail__day-head ${isToday(iso) ? "today" : ""} ${isWeekend(day) ? "weekend" : ""}`}
                    onClick={() => {
                      setAnchor(day);
                      setMode("day");
                    }}
                  >
                    <span>{weekdayCN(day)}</span>
                    <strong>{day.getDate()}</strong>
                  </button>
                );
              })}
            </div>
            <div className="week-detail__all-day">
              <div className="week-detail__all-day-label">任务</div>
              {days.map((day) => {
                const iso = toISODate(day);
                const activeTasks = state.tasks.filter(
                  (task) => task.startDate <= iso && task.endDate >= iso,
                );
                return (
                  <div className="week-detail__all-day-cell" key={iso}>
                    {activeTasks.slice(0, 2).map((task) => {
                      const color = colorForProject(task.projectId);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          className="week-detail__task"
                          style={{ background: color, color: contrastText(color) }}
                          onClick={() => openTaskEditor(task)}
                          title={task.name}
                        >
                          {task.name}
                        </button>
                      );
                    })}
                    {activeTasks.length > 2 && (
                      <span className="week-detail__task-more">+{activeTasks.length - 2}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="week-detail__body">
              <div className="week-detail__time-axis">
                {Array.from(
                  { length: WEEK_DETAIL_END_HOUR - WEEK_DETAIL_START_HOUR },
                  (_, index) => {
                    const hour = WEEK_DETAIL_START_HOUR + index;
                    return (
                      <div key={hour} className="week-detail__time" style={{ height: HOUR_HEIGHT }}>
                        {`${String(hour).padStart(2, "0")}:00`}
                      </div>
                    );
                  },
                )}
              </div>
              <div className="week-detail__day-columns">
                {days.map((day, dayIndex) => (
                  <div className="week-detail__day-column" key={toISODate(day)}>
                    {plansOfWeek[dayIndex].map((plan) => {
                      const start = timeToMinutes(plan.startTime);
                      const end = timeToMinutes(plan.endTime);
                      const visibleStart = Math.max(start, WEEK_DETAIL_START_HOUR * 60);
                      const visibleEnd = Math.min(end, WEEK_DETAIL_END_HOUR * 60);
                      const layout = layoutsOfWeek[dayIndex].get(plan.id) ?? {
                        column: 0,
                        columnCount: 1,
                      };
                      const top = ((visibleStart - WEEK_DETAIL_START_HOUR * 60) / 60) * HOUR_HEIGHT;
                      const height = Math.max(((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 4, 24);
                      const color = colorForProject(plan.projectId);
                      if (visibleEnd <= visibleStart) return null;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          className="week-detail__plan"
                          style={{
                            top,
                            height,
                            left: `calc(${(layout.column / layout.columnCount) * 100}% + 3px)`,
                            width: `calc(${(100 / layout.columnCount)}% - 6px)`,
                            background: color,
                            color: contrastText(color),
                            opacity: plan.done ? 0.58 : 1,
                          }}
                          onClick={() => openPlanEditor(plan)}
                          title={`${plan.name} · ${plan.startTime} - ${plan.endTime}`}
                        >
                          <strong>{plan.name}</strong>
                          <span>{plan.startTime} - {plan.endTime}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "day" && (
        <div className="calendar-day-layout">
          <OutlinedCard className="calendar-timeline-card" style={{ padding: 0 }}>
            <div className="timeline" style={{ gridTemplateColumns: "56px 1fr" }}>
              <div
                className="col"
                style={{ position: "relative", height: DAY_MINUTES / 60 * HOUR_HEIGHT }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <div key={hour} className="timeline__hour" style={{ height: HOUR_HEIGHT }}>
                    {`${String(hour).padStart(2, "0")}:00`}
                  </div>
                ))}
              </div>
              <div
                className="timeline__col"
                style={{ height: DAY_MINUTES / 60 * HOUR_HEIGHT }}
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    style={{
                      position: "absolute",
                      top: hour * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      borderTop: "1px solid var(--md-outline-variant)",
                      height: 0,
                    }}
                  />
                ))}
                {plansOfDay.map((plan) => {
                  const start = timeToMinutes(plan.startTime);
                  const end = timeToMinutes(plan.endTime);
                  const total = (DAY_MINUTES / 60) * HOUR_HEIGHT;
                  const top = (start / DAY_MINUTES) * total;
                  const height = Math.max(((end - start) / DAY_MINUTES) * total - 4, 20);
                  const color = colorForProject(plan.projectId);
                  const project = plan.projectId ? projectById.get(plan.projectId) : null;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className="timeline__block"
                      style={{
                        top,
                        height,
                        background: color,
                        color: contrastText(color),
                        opacity: plan.done ? 0.55 : 1,
                      }}
                      onClick={() => openPlanEditor(plan)}
                    >
                      <strong className="body-sm" style={{ textDecoration: plan.done ? "line-through" : "none" }}>
                        {plan.name}
                      </strong>
                      <span className="body-sm" style={{ fontSize: 11, opacity: 0.9 }}>
                        {plan.startTime} - {plan.endTime}
                        {project ? ` · ${project.name}` : " · 独立"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </OutlinedCard>

          <aside className="calendar-day-sidebar">
            {tasksOfDay.length > 0 && (
              <FilledCard className="material-card calendar-task-card" style={{ padding: "12px 16px" }}>
                <div className="label-lg muted mb-8">今日进行中的任务</div>
                <div className="col gap-8">
                  {tasksOfDay.map((task) => {
                    const color = colorForProject(task.projectId);
                    return (
                      <TonalButton
                        key={task.id}
                        className="calendar-task-chip calendar-task-chip--full"
                        onClick={() => openTaskEditor(task)}
                      >
                        <span slot="icon" className="dot" style={{ background: color }} />
                        <span className="ellipsis">{task.name}</span>
                      </TonalButton>
                    );
                  })}
                </div>
              </FilledCard>
            )}

            <section className="calendar-day-plans">
              <div className="label-lg muted mb-8">当日计划清单（{plansOfDay.length}）</div>
              {plansOfDay.length === 0 ? (
                <FilledCard className="material-card empty" style={{ padding: 24 }}>
                  <Icon name="free_breakfast" size={40} />
                  <div>当天暂无计划，点击右上角「添加计划」安排一项</div>
                </FilledCard>
              ) : (
                <div className="col gap-4">
                  {plansOfDay.map((plan) => {
                    const color = colorForProject(plan.projectId);
                    return (
                      <OutlinedCard
                        className="list-item calendar-plan-card"
                        key={plan.id}
                        onClick={() => openPlanEditor(plan)}
                        style={{ padding: "10px 14px" }}
                      >
                        <Checkbox
                          checked={plan.done}
                          aria-label={`标记计划「${plan.name}」${plan.done ? "未完成" : "已完成"}`}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => store.updateDailyPlan(plan.id, { done: !plan.done })}
                        />
                        <span className="dot" style={{ background: color }} />
                        <span
                          className="body-md grow ellipsis"
                          style={{ textDecoration: plan.done ? "line-through" : "none" }}
                        >
                          {plan.name}
                        </span>
                        {plan.recurrence.frequency !== "none" && (
                          <span className="chip chip--small">
                            {dailyPlanRepeatLabel(plan.recurrence.frequency)} {plan.recurrence.occurrence}/{plan.recurrence.count}
                          </span>
                        )}
                        <span className="chip chip--small">{plan.startTime} - {plan.endTime}</span>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            askDeletePlan(plan);
                          }}
                          aria-label="删除"
                          title="删除"
                        >
                          <Icon name="delete" size={18} />
                        </IconButton>
                      </OutlinedCard>
                    );
                  })}
                </div>
              )}
            </section>
          </aside>
        </div>
      )}

      <Dialog
        open={taskForm.open}
        onClose={() => setTaskForm((current) => ({ ...current, open: false }))}
        title={taskForm.editing ? "编辑任务" : "新建任务"}
      >
        <TaskForm
          initial={taskForm.editing}
          projectId={taskForm.projectId}
          onCancel={() => setTaskForm((current) => ({ ...current, open: false }))}
          onSubmit={(input) => {
            if (taskForm.editing) {
              store.updateTask(taskForm.editing.id, input);
              show("任务已更新");
            } else {
              store.addTask({ ...input, projectId: taskForm.projectId });
              show("任务已创建");
            }
            setTaskForm((current) => ({ ...current, open: false }));
          }}
        />
      </Dialog>

      <Dialog
        open={planForm.open}
        onClose={() => setPlanForm((current) => ({ ...current, open: false }))}
        title={planForm.editing ? "编辑计划" : "新建每日计划"}
      >
        <DailyPlanForm
          initial={planForm.editing}
          lockProject={planForm.lockProject}
          lockTask={planForm.lockTask}
          defaultDate={planForm.defaultDate}
          onCancel={() => setPlanForm((current) => ({ ...current, open: false }))}
          onSubmit={(input) => {
            const { repeat: _repeat, repeatCount: _repeatCount, ...planPatch } = input;
            if (planForm.editing) {
              store.updateDailyPlan(planForm.editing.id, planPatch);
              show("计划已更新");
            } else {
              store.addDailyPlan(input);
              show(input.repeat === "none" ? "计划已添加" : `已添加 ${input.repeatCount} 个计划`);
            }
            setPlanForm((current) => ({ ...current, open: false }));
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={() => setConfirm((current) => ({ ...current, open: false }))}
        onConfirm={confirm.onConfirm}
      />
    </div>
  );
}
