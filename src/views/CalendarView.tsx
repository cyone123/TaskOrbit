import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  DAY_MS,
  addDays,
  dailyPlanRepeatLabel,
  formatDate,
  formatDateFull,
  isToday,
  isWeekend,
  layoutMonthWeekTasks,
  layoutPlanColumns,
  monthGridDays,
  monthLabel,
  parseISODate,
  startOfWeek,
  timeToMinutes,
  toISODate,
  weekDays,
  weekdayCN,
  type DailyPlan,
  type Task,
} from "@task-orbit/core";
import { Icon } from "../components/Icon";
import { DailyPlanForm, TaskForm } from "../components/forms";
import {
  Checkbox,
  FilledButton,
  IconButton,
  OutlinedSegmentedButton,
  OutlinedSegmentedButtonSet,
  OutlinedSelect,
  SelectOption,
  TextButton,
  TonalButton,
  eventValue,
} from "../components/material";
import { Badge, ConfirmDialog, Dialog, EmptyState, SectionHeader, useSnackbar } from "../components/ui";
import { colorByKey } from "../store/colors";
import { useStore } from "../store/store";
import {
  type PlanDragMode,
  computeDraggedPlanTimes,
  computeTargetDayFromX,
} from "../utils/calendarDrag";

const HOUR_HEIGHT = 44;

type CalendarMode = "month" | "week" | "day";
type WeekViewMode = "gantt" | "detail";
type MonthViewFilter = "all" | "tasks" | "plans";

interface BarRange {
  startIdx: number;
  endIdx: number;
}

interface CalendarDragState {
  plan: DailyPlan;
  mode: PlanDragMode;
  view: "day" | "week";
  startX: number;
  startY: number;
  startScrollTop: number;
  targetDate: string;
  targetDayIndex: number;
  startTime: string;
  endTime: string;
  hasMoved: boolean;
}

export function CalendarView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();

  const [mode, setMode] = useState<CalendarMode>("week");
  const [weekView, setWeekView] = useState<WeekViewMode>("gantt");
  const [monthFilter, setMonthFilter] = useState<MonthViewFilter>("all");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const weekDetailStartHour = state.settings.weekDetailStartHour ?? 6;
  const weekDetailEndHour = state.settings.weekDetailEndHour ?? 24;
  const weekDetailTotalHours = Math.max(1, weekDetailEndHour - weekDetailStartHour);

  const dayStartHour = state.settings.dayStartHour ?? 6;
  const dayEndHour = state.settings.dayEndHour ?? 24;
  const dayTotalHours = Math.max(1, dayEndHour - dayStartHour);

  const monthMaxTaskTracks = state.settings.monthMaxTaskTracks ?? 3;
  const monthMaxDailyPlans = state.settings.monthMaxDailyPlans ?? 4;

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

  const [dragPreview, setDragPreview] = useState<CalendarDragState | null>(null);
  const dragStateRef = useRef<CalendarDragState | null>(null);
  const justDraggedRef = useRef(false);
  const weekColumnsRef = useRef<HTMLDivElement>(null);
  const timelineColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      document.body.classList.remove("is-calendar-dragging");
      document.body.classList.remove("is-calendar-dragging--resize");
    };
  }, []);

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

  const tasksInMonth = useMemo(() => {
    const gridStart = monthDays[0];
    const gridEnd = monthDays[monthDays.length - 1];
    return state.tasks.filter(
      (task) =>
        parseISODate(task.endDate) >= gridStart &&
        parseISODate(task.startDate) <= gridEnd,
    );
  }, [monthDays, state.tasks]);

  const plansInMonthCount = useMemo(() => {
    const gridStartISO = toISODate(monthDays[0]);
    const gridEndISO = toISODate(monthDays[monthDays.length - 1]);
    return state.dailyPlans.filter(
      (plan) => plan.date >= gridStartISO && plan.date <= gridEndISO,
    ).length;
  }, [monthDays, state.dailyPlans]);

  const showTasks = monthFilter === "all" || monthFilter === "tasks";
  const showDailyPlans = monthFilter === "all" || monthFilter === "plans";

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
    () => plansOfWeek.map((plans) => layoutPlanColumns(plans)),
    [plansOfWeek],
  );

  const layoutOfDay = useMemo(
    () => layoutPlanColumns(plansOfDay),
    [plansOfDay],
  );

  const monthWeeks = useMemo(() => {
    const weeks: Date[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }
    return weeks;
  }, [monthDays]);

  useEffect(() => {
    if (mode === "day") {
      const targetHour = Math.max(dayStartHour, 8);
      contentRef.current?.parentElement?.scrollTo({ top: (targetHour - dayStartHour) * HOUR_HEIGHT });
    }
  }, [mode, anchor, dayStartHour]);

  const colorForProject = (projectId: string | null): string => {
    const project = projectId ? projectById.get(projectId) : null;
    return project ? colorByKey(project.color) : "var(--md-outline)";
  };

  /** Events read a raw project hex and derive container/on-container pairs in CSS. */
  const eventVars = (projectId: string | null): CSSProperties =>
    ({ "--event-color": colorForProject(projectId) }) as CSSProperties;

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

  const startDrag = (
    e: React.PointerEvent,
    plan: DailyPlan,
    dragMode: PlanDragMode,
    view: "day" | "week",
    dayIndex = 0,
  ) => {
    if (e.button !== 0) return;
    if (dragStateRef.current) return;

    const scrollContainer = contentRef.current?.parentElement;
    const initialScrollTop = scrollContainer?.scrollTop ?? 0;

    const initialDragState: CalendarDragState = {
      plan,
      mode: dragMode,
      view,
      startX: e.clientX,
      startY: e.clientY,
      startScrollTop: initialScrollTop,
      targetDate: plan.date,
      targetDayIndex: dayIndex,
      startTime: plan.startTime,
      endTime: plan.endTime,
      hasMoved: false,
    };

    dragStateRef.current = initialDragState;

    const handlePointerMove = (ev: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current) return;

      const deltaX = ev.clientX - current.startX;
      const currentScroll = scrollContainer?.scrollTop ?? 0;
      const deltaY = ev.clientY - current.startY + (currentScroll - current.startScrollTop);

      if (!current.hasMoved) {
        if (Math.hypot(deltaX, ev.clientY - current.startY) < 4) {
          return;
        }
        current.hasMoved = true;
        document.body.classList.add("is-calendar-dragging");
        if (current.mode !== "move") {
          document.body.classList.add("is-calendar-dragging--resize");
        }
      }

      const startHour = current.view === "day" ? dayStartHour : weekDetailStartHour;
      const endHour = current.view === "day" ? dayEndHour : weekDetailEndHour;

      const computed = computeDraggedPlanTimes({
        mode: current.mode,
        origStartTime: current.plan.startTime,
        origEndTime: current.plan.endTime,
        deltaY,
        hourHeight: HOUR_HEIGHT,
        minHour: startHour,
        maxHour: endHour,
      });

      let targetDate = current.plan.date;
      let targetDayIndex = current.targetDayIndex;

      if (current.view === "week" && weekColumnsRef.current) {
        const target = computeTargetDayFromX(
          ev.clientX,
          weekColumnsRef.current.getBoundingClientRect(),
          days,
        );
        targetDate = target.targetDate;
        targetDayIndex = target.dayIndex;
      }

      const nextState: CalendarDragState = {
        ...current,
        hasMoved: true,
        targetDate,
        targetDayIndex,
        startTime: computed.startTime,
        endTime: computed.endTime,
      };

      dragStateRef.current = nextState;
      setDragPreview({ ...nextState });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("is-calendar-dragging");
      document.body.classList.remove("is-calendar-dragging--resize");
    };

    const handlePointerUp = () => {
      const finalState = dragStateRef.current;
      cleanup();
      dragStateRef.current = null;
      setDragPreview(null);

      if (finalState && finalState.hasMoved) {
        justDraggedRef.current = true;
        window.setTimeout(() => {
          justDraggedRef.current = false;
        }, 120);

        const changed =
          finalState.targetDate !== finalState.plan.date ||
          finalState.startTime !== finalState.plan.startTime ||
          finalState.endTime !== finalState.plan.endTime;

        if (changed) {
          store.updateDailyPlan(finalState.plan.id, {
            date: finalState.targetDate,
            startTime: finalState.startTime,
            endTime: finalState.endTime,
          });
          const dateNotice =
            finalState.view === "week" && finalState.targetDate !== finalState.plan.date
              ? `${formatDate(finalState.targetDate)} `
              : "";
          show(`计划时间已更新：${dateNotice}${finalState.startTime} - ${finalState.endTime}`);
        }
      }
    };

    const handlePointerCancel = () => {
      cleanup();
      dragStateRef.current = null;
      setDragPreview(null);
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        cleanup();
        dragStateRef.current = null;
        setDragPreview(null);
        show("已取消调整时间");
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("keydown", handleKeyDown);
  };

  const heading =
    mode === "month"
      ? monthLabel(anchor)
      : mode === "week"
        ? `${formatDate(toISODate(days[0]))} - ${formatDate(toISODate(days[6]))}`
        : formatDateFull(selectedISO);

  return (
    <div ref={contentRef} className="calendar-view">
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
          <span className="headline-sm calendar-heading">{heading}</span>
        </div>

        <div className="row gap-8 calendar-toolbar__actions">
          <IconButton
            onClick={() => setCalendarSettingsOpen(true)}
            aria-label="日历设置"
            title="日历设置"
          >
            <Icon name="settings" />
          </IconButton>
          <FilledButton onClick={() => openNewPlan()}>
            <Icon name="add" size={18} slot="icon" /> 添加计划
          </FilledButton>
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

      {mode === "week" && (
        <div className="calendar-subtoolbar">
          <span className="label-lg muted">
            {weekView === "gantt"
              ? `本周 ${tasksInWeek.length} 个任务`
              : `本周 ${plansOfWeek.reduce((total, plans) => total + plans.length, 0)} 项计划`}
          </span>
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
        </div>
      )}

      {mode === "month" && (
        <div className="calendar-subtoolbar">
          <span className="label-lg muted">
            {monthFilter === "tasks"
              ? `本月 ${tasksInMonth.length} 个任务`
              : monthFilter === "plans"
                ? `本月 ${plansInMonthCount} 项计划`
                : `本月 ${tasksInMonth.length} 个任务 · ${plansInMonthCount} 项计划`}
          </span>
          <OutlinedSegmentedButtonSet className="segmented-control calendar-submode-switcher">
            <OutlinedSegmentedButton
              label="全部"
              selected={monthFilter === "all"}
              onClick={() => setMonthFilter("all")}
            >
              <Icon name="grid_view" size={16} slot="icon" />
            </OutlinedSegmentedButton>
            <OutlinedSegmentedButton
              label="任务"
              selected={monthFilter === "tasks"}
              onClick={() => setMonthFilter("tasks")}
            >
              <Icon name="timeline" size={16} slot="icon" />
            </OutlinedSegmentedButton>
            <OutlinedSegmentedButton
              label="每日计划"
              selected={monthFilter === "plans"}
              onClick={() => setMonthFilter("plans")}
            >
              <Icon name="calendar_view_day" size={16} slot="icon" />
            </OutlinedSegmentedButton>
          </OutlinedSegmentedButtonSet>
        </div>
      )}

      {mode === "month" && (
        <div className="month-calendar">
          <div className="month-calendar__weekdays">
            {days.map((day) => (
              <div key={weekdayCN(day)} className="month-calendar__weekday">
                {weekdayCN(day)}
              </div>
            ))}
          </div>
          <div className="month-calendar__weeks">
            {monthWeeks.map((week, weekIdx) => {
              const weekSegments = layoutMonthWeekTasks(state.tasks, week);
              const maxTrack = weekSegments.reduce((m, s) => Math.max(m, s.trackIndex), -1);
              const trackCount = Math.min(maxTrack + 1, monthMaxTaskTracks);
              const visibleSegments = weekSegments.filter((s) => s.trackIndex < monthMaxTaskTracks);

              return (
                <div key={`week-${weekIdx}`} className="month-calendar__week-row">
                  {/* Background Day Cells */}
                  <div className="month-calendar__week-bg">
                    {week.map((day) => {
                      const iso = toISODate(day);
                      const inCurrentMonth = day.getMonth() === monthStart.getMonth();
                      return (
                        <div
                          key={iso}
                          className={`month-calendar__cell-bg ${inCurrentMonth ? "" : "outside"} ${isToday(iso) ? "today" : ""} ${isWeekend(day) ? "weekend" : ""}`}
                        />
                      );
                    })}
                  </div>

                  {/* Foreground Content */}
                  <div className="month-calendar__week-content">
                    {/* Day Headers (Dates) */}
                    <div className="month-calendar__week-headers">
                      {week.map((day) => {
                        const iso = toISODate(day);
                        const inCurrentMonth = day.getMonth() === monthStart.getMonth();
                        return (
                          <div key={iso} className="month-calendar__day-header">
                            <button
                              type="button"
                              className={`month-calendar__date ${inCurrentMonth ? "" : "outside"} ${isToday(iso) ? "today" : ""}`}
                              onClick={() => {
                                setAnchor(day);
                                setMode("day");
                              }}
                              aria-label={`查看${formatDateFull(iso)}`}
                            >
                              {day.getDate()}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Multi-day Task Bars */}
                    {showTasks && visibleSegments.length > 0 && (
                      <div
                        className="month-calendar__task-tracks"
                        style={{
                          gridTemplateRows: `repeat(${trackCount}, 22px)`,
                        }}
                      >
                        {visibleSegments.map((segment) => {
                          const { task, startCol, endCol, isStart, isEnd, trackIndex } = segment;
                          const project = projectById.get(task.projectId);
                          const spanCols = endCol - startCol + 1;
                          return (
                            <button
                              key={`task-seg-${task.id}-${weekIdx}`}
                              type="button"
                              className={`month-task-bar ${task.done ? "month-task-bar--done" : ""} ${!isStart ? "month-task-bar--cont-left" : ""} ${!isEnd ? "month-task-bar--cont-right" : ""}`}
                              style={{
                                gridColumn: `${startCol + 1} / ${endCol + 2}`,
                                gridRow: trackIndex + 1,
                                ...eventVars(task.projectId),
                              }}
                              onClick={() => openTaskEditor(task)}
                              title={`${task.name} · ${task.startDate} ~ ${task.endDate}${project ? ` · ${project.name}` : ""}`}
                            >
                              {!isStart && (
                                <span className="month-task-bar__arrow" aria-hidden="true">
                                  ◀
                                </span>
                              )}
                              <span
                                className="month-task-bar__dot"
                                style={{ backgroundColor: colorForProject(task.projectId) }}
                              />
                              <span className="month-task-bar__name ellipsis">{task.name}</span>
                              {spanCols >= 2 && project && (
                                <span className="month-task-bar__project ellipsis">
                                  {project.name}
                                </span>
                              )}
                              {!isEnd && (
                                <span className="month-task-bar__arrow" aria-hidden="true">
                                  ▶
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Daily Plans Grid */}
                    <div className="month-calendar__week-plans">
                      {week.map((day, colIdx) => {
                        const iso = toISODate(day);
                        const dayPlans = showDailyPlans
                          ? state.dailyPlans
                              .filter((plan) => plan.date === iso)
                              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                          : [];

                        const hiddenTasksInCol = showTasks
                          ? weekSegments.filter(
                              (s) =>
                                s.startCol <= colIdx &&
                                s.endCol >= colIdx &&
                                s.trackIndex >= monthMaxTaskTracks,
                            ).length
                          : 0;
                        const visiblePlans = dayPlans.slice(0, monthMaxDailyPlans);
                        const hiddenPlansCount = dayPlans.length - visiblePlans.length;

                        return (
                          <div
                            key={iso}
                            className="month-calendar__day-col"
                            onClick={(e) => {
                              if (e.target === e.currentTarget) {
                                setAnchor(day);
                                setMode("day");
                              }
                            }}
                          >
                            {hiddenTasksInCol > 0 && (
                              <button
                                type="button"
                                className="month-calendar__more-tasks"
                                onClick={() => {
                                  setAnchor(day);
                                  setMode("day");
                                }}
                                title={`该日还有 ${hiddenTasksInCol} 个任务未在月视图显示，点击查看日视图`}
                              >
                                +{hiddenTasksInCol} 任务
                              </button>
                            )}
                            {visiblePlans.map((plan) => (
                              <button
                                key={`plan-${plan.id}`}
                                type="button"
                                className="month-event month-event--plan"
                                style={eventVars(plan.projectId)}
                                onClick={() => openPlanEditor(plan)}
                                title={`${plan.name} · ${plan.startTime} - ${plan.endTime}`}
                              >
                                <span className="ellipsis">{plan.name}</span>
                                <span className="month-event__time">· {plan.startTime}</span>
                              </button>
                            ))}
                            {hiddenPlansCount > 0 && (
                              <button
                                type="button"
                                className="month-calendar__more"
                                onClick={() => {
                                  setAnchor(day);
                                  setMode("day");
                                }}
                              >
                                还有 {hiddenPlansCount} 项计划
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
                  <button
                    key={iso}
                    type="button"
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
                  </button>
                );
              })}
            </div>
          </div>

          {tasksInWeek.length === 0 ? (
            <EmptyState
              icon="event_busy"
              title="本周没有任务"
              hint="点击上方「添加计划」或在项目中创建任务"
            />
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
                  <button
                    type="button"
                    className="gantt-gutter gantt-gutter--task"
                    onClick={() => openTaskEditor(task)}
                  >
                    <span className="col" style={{ minWidth: 0 }}>
                      <span className="row gap-8">
                        <span className="dot" style={{ background: color }} />
                        <span className={`body-md ellipsis ${task.done ? "text-done" : ""}`}>
                          {task.name}
                        </span>
                      </span>
                      <span className="body-sm muted ellipsis">{project?.name ?? "独立"}</span>
                    </span>
                  </button>
                  <div className="gantt-row__track">
                    <div className="gantt-row__days">
                      {days.map((day) => (
                        <div key={toISODate(day)} />
                      ))}
                    </div>
                    {range && (
                      <button
                        type="button"
                        className="gantt-bar"
                        style={{
                          left: `calc(${left}% + 3px)`,
                          width: `calc(${width}% - 6px)`,
                          top: 8,
                          ...eventVars(task.projectId),
                        }}
                        onClick={() => openTaskEditor(task)}
                        title={`${task.name} · ${task.startDate} ~ ${task.endDate}`}
                      >
                        {task.name}
                      </button>
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
                      {activeTasks.slice(0, 2).map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          className="week-detail__task"
                          style={eventVars(task.projectId)}
                          onClick={() => openTaskEditor(task)}
                          title={task.name}
                        >
                          {task.name}
                        </button>
                      ))}
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
                  { length: weekDetailTotalHours },
                  (_, index) => {
                    const hour = weekDetailStartHour + index;
                    return (
                      <div key={hour} className="week-detail__time" style={{ height: HOUR_HEIGHT }}>
                        {`${String(hour).padStart(2, "0")}:00`}
                      </div>
                    );
                  },
                )}
              </div>
              <div ref={weekColumnsRef} className="week-detail__day-columns">
                {days.map((day, dayIndex) => {
                  const isTargetColumn =
                    dragPreview?.view === "week" &&
                    dragPreview.hasMoved &&
                    dragPreview.targetDayIndex === dayIndex;

                  return (
                    <div
                      className={`week-detail__day-column ${isTargetColumn ? "is-drag-target" : ""}`}
                      key={toISODate(day)}
                    >
                      {plansOfWeek[dayIndex].map((plan) => {
                        const start = timeToMinutes(plan.startTime);
                        const end = timeToMinutes(plan.endTime);
                        const visibleStart = Math.max(start, weekDetailStartHour * 60);
                        const visibleEnd = Math.min(end, weekDetailEndHour * 60);
                        const layout = layoutsOfWeek[dayIndex].get(plan.id) ?? {
                          column: 0,
                          columnCount: 1,
                        };
                        const top = ((visibleStart - weekDetailStartHour * 60) / 60) * HOUR_HEIGHT;
                        const height = Math.max(((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 4, 24);
                        if (visibleEnd <= visibleStart) return null;

                        const isThisDragging =
                          dragPreview?.hasMoved && dragPreview.plan.id === plan.id;

                        return (
                          <button
                            key={plan.id}
                            type="button"
                            className={`week-detail__plan ${isThisDragging ? "is-dragging" : ""}`}
                            style={{
                              top,
                              height,
                              left: `calc(${(layout.column / layout.columnCount) * 100}% + 3px)`,
                              width: `calc(${(100 / layout.columnCount)}% - 6px)`,
                              opacity: plan.done ? 0.58 : 1,
                              ...eventVars(plan.projectId),
                            }}
                            onPointerDown={(e) => startDrag(e, plan, "move", "week", dayIndex)}
                            onClick={() => {
                              if (justDraggedRef.current) return;
                              openPlanEditor(plan);
                            }}
                            title={`${plan.name} · ${plan.startTime} - ${plan.endTime}（按住拖拽移动时间）`}
                          >
                            <div
                              className="plan-resize-handle plan-resize-handle--top"
                              title="拖动调整开始时间"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                startDrag(e, plan, "resize-top", "week", dayIndex);
                              }}
                            />
                            <strong>{plan.name}</strong>
                            <span>{plan.startTime} - {plan.endTime}</span>
                            <div
                              className="plan-resize-handle plan-resize-handle--bottom"
                              title="拖动调整结束时间"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                startDrag(e, plan, "resize-bottom", "week", dayIndex);
                              }}
                            />
                          </button>
                        );
                      })}

                      {isTargetColumn && dragPreview && (
                        (() => {
                          const pStart = timeToMinutes(dragPreview.startTime);
                          const pEnd = timeToMinutes(dragPreview.endTime);
                          const pVisibleStart = Math.max(pStart, weekDetailStartHour * 60);
                          const pVisibleEnd = Math.min(pEnd, weekDetailEndHour * 60);
                          const pTop = ((pVisibleStart - weekDetailStartHour * 60) / 60) * HOUR_HEIGHT;
                          const pHeight = Math.max(((pVisibleEnd - pVisibleStart) / 60) * HOUR_HEIGHT - 4, 24);

                          return (
                            <div
                              className="plan-drag-preview"
                              style={{
                                top: pTop,
                                height: pHeight,
                                left: 3,
                                right: 3,
                                ...eventVars(dragPreview.plan.projectId),
                              }}
                            >
                              <div className="plan-drag-preview__time">
                                <Icon name="schedule" size={12} />
                                {dragPreview.targetDate !== dragPreview.plan.date
                                  ? `${weekdayCN(days[dayIndex])} ${dragPreview.startTime} - ${dragPreview.endTime}`
                                  : `${dragPreview.startTime} - ${dragPreview.endTime}`}
                              </div>
                              <div className="plan-drag-preview__name">
                                {dragPreview.plan.name}
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === "day" && (
        <div className="calendar-day-layout">
          <section className="calendar-timeline-panel">
            <div className="timeline">
              <div
                className="timeline__time-axis"
                style={{ height: dayTotalHours * HOUR_HEIGHT }}
              >
                {Array.from({ length: dayTotalHours }, (_, index) => {
                  const hour = dayStartHour + index;
                  return (
                    <div key={hour} className="timeline__hour" style={{ height: HOUR_HEIGHT }}>
                      {`${String(hour).padStart(2, "0")}:00`}
                    </div>
                  );
                })}
              </div>
              <div
                ref={timelineColRef}
                className="timeline__col"
                style={{ height: dayTotalHours * HOUR_HEIGHT }}
              >
                {Array.from({ length: dayTotalHours }, (_, index) => (
                  <div
                    key={index}
                    className="timeline__grid-row"
                    style={{
                      position: "absolute",
                      top: index * HOUR_HEIGHT,
                      left: 0,
                      right: 0,
                      height: HOUR_HEIGHT,
                      borderBottom: "1px solid var(--md-outline-variant)",
                      boxSizing: "border-box",
                      pointerEvents: "none",
                    }}
                  />
                ))}
                {plansOfDay.map((plan) => {
                  const start = timeToMinutes(plan.startTime);
                  const end = timeToMinutes(plan.endTime);
                  const visibleStart = Math.max(start, dayStartHour * 60);
                  const visibleEnd = Math.min(end, dayEndHour * 60);
                  if (visibleEnd <= visibleStart) return null;

                  const layout = layoutOfDay.get(plan.id) ?? { column: 0, columnCount: 1 };
                  const top = ((visibleStart - dayStartHour * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((visibleEnd - visibleStart) / 60) * HOUR_HEIGHT - 4, 24);
                  const project = plan.projectId ? projectById.get(plan.projectId) : null;
                  const isThisDragging =
                    dragPreview?.view === "day" &&
                    dragPreview.hasMoved &&
                    dragPreview.plan.id === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={`timeline__block ${isThisDragging ? "is-dragging" : ""}`}
                      style={{
                        top,
                        height,
                        left: `calc(${(layout.column / layout.columnCount) * 100}% + 4px)`,
                        width: `calc(${(100 / layout.columnCount)}% - 8px)`,
                        opacity: plan.done ? 0.55 : 1,
                        ...eventVars(plan.projectId),
                      }}
                      onPointerDown={(e) => startDrag(e, plan, "move", "day", 0)}
                      onClick={() => {
                        if (justDraggedRef.current) return;
                        openPlanEditor(plan);
                      }}
                      title={`${plan.name} · ${plan.startTime} - ${plan.endTime}（按住拖拽移动时间）`}
                    >
                      <div
                        className="plan-resize-handle plan-resize-handle--top"
                        title="拖动调整开始时间"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          startDrag(e, plan, "resize-top", "day", 0);
                        }}
                      />
                      <strong className={`body-sm ${plan.done ? "text-done" : ""}`}>
                        {plan.name}
                      </strong>
                      <span className="body-sm" style={{ fontSize: 11, opacity: 0.9 }}>
                        {plan.startTime} - {plan.endTime}
                        {project ? ` · ${project.name}` : " · 独立"}
                      </span>
                      <div
                        className="plan-resize-handle plan-resize-handle--bottom"
                        title="拖动调整结束时间"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          startDrag(e, plan, "resize-bottom", "day", 0);
                        }}
                      />
                    </button>
                  );
                })}

                {dragPreview?.view === "day" && dragPreview.hasMoved && (
                  (() => {
                    const pStart = timeToMinutes(dragPreview.startTime);
                    const pEnd = timeToMinutes(dragPreview.endTime);
                    const pVisibleStart = Math.max(pStart, dayStartHour * 60);
                    const pVisibleEnd = Math.min(pEnd, dayEndHour * 60);
                    const pTop = ((pVisibleStart - dayStartHour * 60) / 60) * HOUR_HEIGHT;
                    const pHeight = Math.max(((pVisibleEnd - pVisibleStart) / 60) * HOUR_HEIGHT - 4, 24);

                    return (
                      <div
                        className="plan-drag-preview"
                        style={{
                          top: pTop,
                          height: pHeight,
                          left: 4,
                          right: 4,
                          ...eventVars(dragPreview.plan.projectId),
                        }}
                      >
                        <div className="plan-drag-preview__time">
                          <Icon name="schedule" size={12} />
                          {dragPreview.startTime} - {dragPreview.endTime}
                        </div>
                        <div className="plan-drag-preview__name">
                          {dragPreview.plan.name}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </section>

          <aside className="calendar-day-sidebar">
            {tasksOfDay.length > 0 && (
              <section className="calendar-side-block">
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
              </section>
            )}

            <section className="calendar-day-plans">
              <div className="label-lg muted mb-8">当日计划清单（{plansOfDay.length}）</div>
              {plansOfDay.length === 0 ? (
                <EmptyState
                  icon="free_breakfast"
                  title="当天暂无计划"
                  hint="点击右上角「添加计划」安排一项"
                />
              ) : (
                <div className="col gap-4">
                  {plansOfDay.map((plan) => {
                    const color = colorForProject(plan.projectId);
                    return (
                      <div
                        className="list-item calendar-plan-row"
                        key={plan.id}
                        onClick={() => openPlanEditor(plan)}
                      >
                        <Checkbox
                          checked={plan.done}
                          aria-label={`标记计划「${plan.name}」${plan.done ? "未完成" : "已完成"}`}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => store.updateDailyPlan(plan.id, { done: !plan.done })}
                        />
                        <span className="dot" style={{ background: color }} />
                        <span className={`body-md grow ellipsis ${plan.done ? "text-done" : ""}`}>
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
                      </div>
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
            if (planForm.editing) {
              store.updateDailyPlan(planForm.editing.id, input);
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

      <CalendarSettingsDialog
        open={calendarSettingsOpen}
        onClose={() => setCalendarSettingsOpen(false)}
      />
    </div>
  );
}

interface CalendarSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function CalendarSettingsDialog({ open, onClose }: CalendarSettingsDialogProps) {
  const { state, updateSettings } = useStore();
  const { show } = useSnackbar();
  const s = state.settings;

  const [weekDetailStartHour, setWeekDetailStartHour] = useState<number>(s.weekDetailStartHour ?? 6);
  const [weekDetailEndHour, setWeekDetailEndHour] = useState<number>(s.weekDetailEndHour ?? 24);
  const [dayStartHour, setDayStartHour] = useState<number>(s.dayStartHour ?? 6);
  const [dayEndHour, setDayEndHour] = useState<number>(s.dayEndHour ?? 24);
  const [monthMaxTaskTracks, setMonthMaxTaskTracks] = useState<number>(s.monthMaxTaskTracks ?? 3);
  const [monthMaxDailyPlans, setMonthMaxDailyPlans] = useState<number>(s.monthMaxDailyPlans ?? 4);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (open) {
      setWeekDetailStartHour(s.weekDetailStartHour ?? 6);
      setWeekDetailEndHour(s.weekDetailEndHour ?? 24);
      setDayStartHour(s.dayStartHour ?? 6);
      setDayEndHour(s.dayEndHour ?? 24);
      setMonthMaxTaskTracks(s.monthMaxTaskTracks ?? 3);
      setMonthMaxDailyPlans(s.monthMaxDailyPlans ?? 4);
      setError("");
    }
  }, [
    open,
    s.weekDetailStartHour,
    s.weekDetailEndHour,
    s.dayStartHour,
    s.dayEndHour,
    s.monthMaxTaskTracks,
    s.monthMaxDailyPlans,
  ]);

  const handleReset = () => {
    setWeekDetailStartHour(6);
    setWeekDetailEndHour(24);
    setDayStartHour(6);
    setDayEndHour(24);
    setMonthMaxTaskTracks(3);
    setMonthMaxDailyPlans(4);
    setError("");
  };

  const handleSave = () => {
    if (weekDetailEndHour <= weekDetailStartHour) {
      setError("周视图结束时间必须晚于起始时间");
      return;
    }
    if (dayEndHour <= dayStartHour) {
      setError("日视图结束时间必须晚于起始时间");
      return;
    }
    updateSettings({
      weekDetailStartHour,
      weekDetailEndHour,
      dayStartHour,
      dayEndHour,
      monthMaxTaskTracks,
      monthMaxDailyPlans,
    });
    show("日历设置已保存");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="日历显示设置"
      actions={
        <>
          <TextButton type="button" onClick={handleReset}>
            恢复默认
          </TextButton>
          <div style={{ flex: 1 }} />
          <TextButton type="button" onClick={onClose}>
            取消
          </TextButton>
          <FilledButton type="button" onClick={handleSave}>
            保存
          </FilledButton>
        </>
      }
    >
      <div className="calendar-settings-dialog">
        <div className="calendar-settings-dialog__group">
          <h4 className="calendar-settings-dialog__subtitle">周视图每日计划时间表</h4>
          <div className="field__row">
            <div className="field">
              <OutlinedSelect
                label="起始时间"
                value={String(weekDetailStartHour)}
                onChange={(e) => {
                  setWeekDetailStartHour(Number(eventValue(e)));
                  setError("");
                }}
                menuPositioning="fixed"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectOption key={i} value={String(i)} selected={weekDetailStartHour === i}>
                    <span slot="headline">
                      {`${String(i).padStart(2, "0")}:00`}{i === 6 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
            <div className="field">
              <OutlinedSelect
                label="结束时间"
                value={String(weekDetailEndHour)}
                onChange={(e) => {
                  setWeekDetailEndHour(Number(eventValue(e)));
                  setError("");
                }}
                menuPositioning="fixed"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                  <SelectOption key={i} value={String(i)} selected={weekDetailEndHour === i}>
                    <span slot="headline">
                      {`${String(i).padStart(2, "0")}:00`}{i === 24 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
          </div>
        </div>

        <div className="calendar-settings-dialog__group">
          <h4 className="calendar-settings-dialog__subtitle">日视图时间表</h4>
          <div className="field__row">
            <div className="field">
              <OutlinedSelect
                label="起始时间"
                value={String(dayStartHour)}
                onChange={(e) => {
                  setDayStartHour(Number(eventValue(e)));
                  setError("");
                }}
                menuPositioning="fixed"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <SelectOption key={i} value={String(i)} selected={dayStartHour === i}>
                    <span slot="headline">
                      {`${String(i).padStart(2, "0")}:00`}{i === 6 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
            <div className="field">
              <OutlinedSelect
                label="结束时间"
                value={String(dayEndHour)}
                onChange={(e) => {
                  setDayEndHour(Number(eventValue(e)));
                  setError("");
                }}
                menuPositioning="fixed"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((i) => (
                  <SelectOption key={i} value={String(i)} selected={dayEndHour === i}>
                    <span slot="headline">
                      {`${String(i).padStart(2, "0")}:00`}{i === 24 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
          </div>
        </div>

        <div className="calendar-settings-dialog__group">
          <h4 className="calendar-settings-dialog__subtitle">月视图显示上限</h4>
          <div className="field__row">
            <div className="field">
              <OutlinedSelect
                label="最大任务轨道数"
                value={String(monthMaxTaskTracks)}
                onChange={(e) => setMonthMaxTaskTracks(Number(eventValue(e)))}
                menuPositioning="fixed"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                  <SelectOption key={num} value={String(num)} selected={monthMaxTaskTracks === num}>
                    <span slot="headline">
                      {num} 轨{num === 3 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
            <div className="field">
              <OutlinedSelect
                label="最大每日计划数"
                value={String(monthMaxDailyPlans)}
                onChange={(e) => setMonthMaxDailyPlans(Number(eventValue(e)))}
                menuPositioning="fixed"
              >
                {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                  <SelectOption key={num} value={String(num)} selected={monthMaxDailyPlans === num}>
                    <span slot="headline">
                      {num} 项{num === 4 ? "（默认）" : ""}
                    </span>
                  </SelectOption>
                ))}
              </OutlinedSelect>
            </div>
          </div>
        </div>

        {error && <p className="error-text body-sm" style={{ margin: "4px 0 0" }}>{error}</p>}
      </div>
    </Dialog>
  );
}
