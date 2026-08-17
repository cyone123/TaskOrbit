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
import { useStore } from "../store/store";
import type { DailyPlan, Task } from "../types";
import {
  DAY_MS,
  addDays,
  formatDate,
  formatDateFull,
  isSameDay,
  isToday,
  isWeekend,
  monthLabel,
  parseISODate,
  startOfWeek,
  timeToMinutes,
  toISODate,
  todayISO,
  weekDays,
  weekdayCN,
} from "../utils/date";

const HOUR_HEIGHT = 44;
const DAY_MINUTES = 24 * 60;

interface BarRange {
  startIdx: number;
  endIdx: number;
}

export function CalendarView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();

  const [mode, setMode] = useState<"week" | "day">("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const contentRef = useRef<HTMLDivElement>(null);

  const [taskForm, setTaskForm] = useState<{ open: boolean; projectId: string; editing: Task | null }>({ open: false, projectId: "", editing: null });
  const [planForm, setPlanForm] = useState<{ open: boolean; projectId: string | null; taskId: string | null; lockProject: boolean; lockTask: boolean; defaultDate?: string; editing: DailyPlan | null }>({ open: false, projectId: null, taskId: null, lockProject: false, lockTask: false, editing: null });
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const weekStart = startOfWeek(anchor);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const selectedISO = toISODate(anchor);

  const projectById = useMemo(() => {
    const map = new Map(state.projects.map((p) => [p.id, p]));
    return map;
  }, [state.projects]);

  const tasksInWeek = useMemo(() => {
    const ws = startOfWeek(anchor);
    const we = addDays(ws, 6);
    return state.tasks
      .filter((t) => parseISODate(t.endDate) >= ws && parseISODate(t.startDate) <= we)
      .sort((a, b) => {
        const pa = projectById.get(a.projectId)?.startDate ?? "";
        const pb = projectById.get(b.projectId)?.startDate ?? "";
        if (pa !== pb) return pa < pb ? -1 : 1;
        return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : a.name.localeCompare(b.name);
      });
  }, [state.tasks, anchor, projectById]);

  const plansOfDay = useMemo(() => {
    return state.dailyPlans
      .filter((pl) => pl.date === selectedISO)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [state.dailyPlans, selectedISO]);

  const tasksOfDay = useMemo(() => {
    return state.tasks.filter((t) => t.startDate <= selectedISO && t.endDate >= selectedISO);
  }, [state.tasks, selectedISO]);

  useEffect(() => {
    if (mode === "day") {
      contentRef.current?.parentElement?.scrollTo({ top: 8 * HOUR_HEIGHT - 60 });
    }
  }, [mode, anchor]);

  const rangeFor = (t: Task): BarRange | null => {
    const ws = startOfWeek(anchor);
    const start = parseISODate(t.startDate);
    const end = parseISODate(t.endDate);
    const we = addDays(ws, 6);
    if (end < ws || start > we) return null;
    const s = start > ws ? start : ws;
    const e = end < we ? end : we;
    return {
      startIdx: Math.round((s.getTime() - ws.getTime()) / DAY_MS),
      endIdx: Math.round((e.getTime() - ws.getTime()) / DAY_MS),
    };
  };

  const navigate = (dir: number) => {
    setAnchor((a) => addDays(a, mode === "week" ? dir * 7 : dir));
  };

  const goToday = () => setAnchor(new Date());

  const openTaskEditor = (t: Task) => setTaskForm({ open: true, projectId: t.projectId, editing: t });

  const openPlanEditor = (pl: DailyPlan) =>
    setPlanForm({ open: true, projectId: pl.projectId, taskId: pl.taskId, lockProject: true, lockTask: true, editing: pl });

  const askDeletePlan = (pl: DailyPlan) =>
    setConfirm({
      open: true,
      title: "删除计划",
      message: `确定删除计划「${pl.name}」吗？`,
      onConfirm: () => {
        store.deleteDailyPlan(pl.id);
        setConfirm((c) => ({ ...c, open: false }));
        show("计划已删除");
      },
    });

  const heading =
    mode === "week"
      ? `${monthLabel(days[0])}${days[6].getMonth() !== days[0].getMonth() ? " - " + monthLabel(days[6]) : ""}`
      : formatDateFull(selectedISO);

  return (
    <div ref={contentRef} style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 96 }}>
      <div className="spread mb-16">
        <div className="row gap-8">
          <IconButton onClick={() => navigate(-1)} aria-label="上一页" title="上一页">
            <Icon name="chevron_left" />
          </IconButton>
          <IconButton onClick={() => navigate(1)} aria-label="下一页" title="下一页">
            <Icon name="chevron_right" />
          </IconButton>
          <TonalButton className="compact-action" onClick={goToday}>
            今天
          </TonalButton>
          <span className="title-lg" style={{ marginLeft: 8 }}>{heading}</span>
        </div>

        <div className="row gap-12">
          {mode === "day" && (
            <TonalButton onClick={() => setPlanForm({ open: true, projectId: null, taskId: null, lockProject: false, lockTask: false, defaultDate: selectedISO, editing: null })}>
              <Icon name="add" size={18} slot="icon" /> 添加计划
            </TonalButton>
          )}
          <OutlinedSegmentedButtonSet className="segmented-control">
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

      {mode === "week" ? (
        <div className="gantt">
          <div className="gantt-head">
            <div className="gantt-gutter">任务 / 项目</div>
            <div className="gantt-head__track">
              {days.map((d) => {
                const iso = toISODate(d);
                const count = state.dailyPlans.filter((pl) => pl.date === iso).length;
                return (
                  <div
                    key={iso}
                    className={`gantt-dayhead ${isToday(iso) ? "today" : ""} ${isWeekend(d) ? "weekend" : ""}`}
                    onClick={() => {
                      setAnchor(d);
                      setMode("day");
                    }}
                    title="切换到日视图"
                  >
                    <div className="label-sm">{weekdayCN(d)}</div>
                    <div className="num">{d.getDate()}</div>
                    <div className="body-sm" style={{ fontSize: 11 }}>{count > 0 ? `${count} 项计划` : "\u00A0"}</div>
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
            tasksInWeek.map((t) => {
              const range = rangeFor(t);
              const proj = projectById.get(t.projectId);
              const color = proj ? colorByKey(proj.color) : "#9e9e9e";
              const left = range ? (range.startIdx / 7) * 100 : 0;
              const width = range ? ((range.endIdx - range.startIdx + 1) / 7) * 100 : 0;
              return (
                <div className="gantt-row" key={t.id}>
                  <div className="gantt-gutter" style={{ cursor: "pointer" }} onClick={() => openTaskEditor(t)}>
                    <div className="col" style={{ minWidth: 0 }}>
                      <div className="row gap-8">
                        <span className="dot" style={{ background: color }} />
                        <span className="body-md ellipsis" style={{ textDecoration: t.done ? "line-through" : "none" }}>{t.name}</span>
                      </div>
                      <div className="body-sm muted ellipsis">{proj?.name ?? "独立"}</div>
                    </div>
                  </div>
                  <div className="gantt-row__track">
                    <div className="gantt-row__days">
                      {days.map((d) => (
                        <div key={toISODate(d)} />
                      ))}
                    </div>
                    {range && (
                      <div
                        className="gantt-bar"
                        style={{ left: `calc(${left}% + 3px)`, width: `calc(${width}% - 6px)`, background: color, color: contrastText(color), top: 8 }}
                        onClick={() => openTaskEditor(t)}
                        title={`${t.name} · ${t.startDate} ~ ${t.endDate}`}
                      >
                        {t.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="col gap-16">
          {tasksOfDay.length > 0 && (
            <FilledCard className="material-card calendar-task-card" style={{ padding: "12px 16px" }}>
              <div className="label-lg muted mb-8">今日进行中的任务</div>
              <div className="row row--wrap gap-8">
                {tasksOfDay.map((t) => {
                  const proj = projectById.get(t.projectId);
                  const color = proj ? colorByKey(proj.color) : "#9e9e9e";
                  return (
                    <TonalButton key={t.id} className="calendar-task-chip" onClick={() => openTaskEditor(t)}>
                      <span slot="icon" className="dot" style={{ background: color }} />
                      {t.name}
                    </TonalButton>
                  );
                })}
              </div>
            </FilledCard>
          )}

          <OutlinedCard className="calendar-timeline-card" style={{ padding: 0 }}>
            <div className="timeline" style={{ gridTemplateColumns: "56px 1fr" }}>
              <div className="col" style={{ position: "relative", height: DAY_MINUTES / 60 * HOUR_HEIGHT }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="timeline__hour" style={{ height: HOUR_HEIGHT }}>
                    {h === 0 ? "00:00" : `${h}:00`}
                  </div>
                ))}
              </div>
              <div className="timeline__col" style={{ height: DAY_MINUTES / 60 * HOUR_HEIGHT }}>
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} style={{ position: "absolute", top: h * HOUR_HEIGHT, left: 0, right: 0, borderTop: "1px solid var(--md-outline-variant)", height: 0 }} />
                ))}
                {plansOfDay.map((pl) => {
                  const start = timeToMinutes(pl.startTime);
                  const end = timeToMinutes(pl.endTime);
                  const total = DAY_MINUTES / 60 * HOUR_HEIGHT;
                  const top = (start / DAY_MINUTES) * total;
                  const height = Math.max(((end - start) / DAY_MINUTES) * total - 4, 20);
                  const proj = pl.projectId ? projectById.get(pl.projectId) : null;
                  const color = proj ? colorByKey(proj.color) : "#7a757f";
                  return (
                    <div
                      key={pl.id}
                      className="timeline__block"
                      style={{ top, height, background: color, color: contrastText(color), opacity: pl.done ? 0.55 : 1 }}
                      onClick={() => openPlanEditor(pl)}
                    >
                      <div className="body-sm" style={{ fontWeight: 600, textDecoration: pl.done ? "line-through" : "none" }}>{pl.name}</div>
                      <div className="body-sm" style={{ fontSize: 11, opacity: 0.9 }}>
                        {pl.startTime} - {pl.endTime}
                        {proj ? ` · ${proj.name}` : " · 独立"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </OutlinedCard>

          <div>
            <div className="label-lg muted mb-8">当日计划清单（{plansOfDay.length}）</div>
            {plansOfDay.length === 0 ? (
              <FilledCard className="material-card empty" style={{ padding: 24 }}>
                <Icon name="free_breakfast" size={40} />
                <div>当天暂无计划，点击右上角「添加计划」安排一项</div>
              </FilledCard>
            ) : (
              <div className="col gap-4">
                {plansOfDay.map((pl) => {
                  const proj = pl.projectId ? projectById.get(pl.projectId) : null;
                  const color = proj ? colorByKey(proj.color) : "var(--md-outline)";
                  return (
                    <OutlinedCard className="list-item calendar-plan-card" key={pl.id} onClick={() => openPlanEditor(pl)} style={{ padding: "10px 14px" }}>
                      <Checkbox
                        checked={pl.done}
                        aria-label={`标记计划「${pl.name}」${pl.done ? "未完成" : "已完成"}`}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => store.updateDailyPlan(pl.id, { done: !pl.done })}
                      />
                      <span className="dot" style={{ background: color }} />
                      <span className="body-md grow ellipsis" style={{ textDecoration: pl.done ? "line-through" : "none" }}>{pl.name}</span>
                      <span className="chip chip--small">{pl.startTime} - {pl.endTime}</span>
                      <IconButton onClick={(e) => { e.stopPropagation(); askDeletePlan(pl); }} aria-label="删除" title="删除">
                        <Icon name="delete" size={18} />
                      </IconButton>
                    </OutlinedCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={taskForm.open} onClose={() => setTaskForm((s) => ({ ...s, open: false }))} title={taskForm.editing ? "编辑任务" : "新建任务"}>
        <TaskForm
          initial={taskForm.editing}
          projectId={taskForm.projectId}
          onCancel={() => setTaskForm((s) => ({ ...s, open: false }))}
          onSubmit={(input) => {
            if (taskForm.editing) {
              store.updateTask(taskForm.editing.id, input);
              show("任务已更新");
            } else {
              store.addTask({ ...input, projectId: taskForm.projectId });
              show("任务已创建");
            }
            setTaskForm((s) => ({ ...s, open: false }));
          }}
        />
      </Dialog>

      <Dialog open={planForm.open} onClose={() => setPlanForm((s) => ({ ...s, open: false }))} title={planForm.editing ? "编辑计划" : "新建每日计划"}>
        <DailyPlanForm
          initial={planForm.editing}
          lockProject={planForm.lockProject}
          lockTask={planForm.lockTask}
          defaultDate={planForm.defaultDate}
          onCancel={() => setPlanForm((s) => ({ ...s, open: false }))}
          onSubmit={(input) => {
            if (planForm.editing) {
              store.updateDailyPlan(planForm.editing.id, input);
              show("计划已更新");
            } else {
              store.addDailyPlan(input);
              show("计划已添加");
            }
            setPlanForm((s) => ({ ...s, open: false }));
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        onConfirm={confirm.onConfirm}
      />
    </div>
  );
}
