import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { DailyPlanForm, ProjectForm, TaskForm } from "../components/forms";
import { ConfirmDialog, Dialog, EmptyState, useSnackbar } from "../components/ui";
import { colorByKey } from "../store/colors";
import { useStore } from "../store/store";
import type { DailyPlan, Priority, Project, Task } from "../types";
import {
  formatDate,
  formatTime,
  relativeRangeLabel,
  todayISO,
} from "../utils/date";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "#E53935",
  medium: "#F9A825",
  low: "#43A047",
};

function statusLabel(startISO: string, endISO: string): { text: string; color: string } {
  const today = todayISO();
  if (today < startISO) return { text: "未开始", color: "var(--md-on-surface-variant)" };
  if (today > endISO) return { text: "已结束", color: "var(--md-outline)" };
  return { text: "进行中", color: "#43A047" };
}

export function ProjectsView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();

  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [projForm, setProjForm] = useState<{ open: boolean; editing: Project | null }>({
    open: false,
    editing: null,
  });
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

  const toggleProject = (id: string) =>
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const toggleTask = (id: string) =>
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const tasksOfProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of state.tasks) {
      const list = map.get(t.projectId) ?? [];
      list.push(t);
      map.set(t.projectId, list);
    }
    return map;
  }, [state.tasks]);

  const plansOfTask = useMemo(() => {
    const map = new Map<string, DailyPlan[]>();
    for (const pl of state.dailyPlans) {
      if (!pl.taskId) continue;
      const list = map.get(pl.taskId) ?? [];
      list.push(pl);
      map.set(pl.taskId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    }
    return map;
  }, [state.dailyPlans]);

  const independentPlans = useMemo(() => {
    const map = new Map<string, DailyPlan[]>();
    for (const pl of state.dailyPlans) {
      if (pl.taskId || !pl.projectId) continue;
      const list = map.get(pl.projectId) ?? [];
      list.push(pl);
      map.set(pl.projectId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.startTime < b.startTime ? -1 : 1));
    }
    return map;
  }, [state.dailyPlans]);

  const askDeleteProject = (p: Project) => {
    setConfirm({
      open: true,
      title: "删除项目",
      message: `确定删除项目「${p.name}」吗？其下的所有任务与计划也会一并删除。`,
      onConfirm: () => {
        store.deleteProject(p.id);
        setConfirm((c) => ({ ...c, open: false }));
        show("项目已删除");
      },
    });
  };

  const askDeleteTask = (t: Task) => {
    setConfirm({
      open: true,
      title: "删除任务",
      message: `确定删除任务「${t.name}」吗？其下的每日计划也会一并删除。`,
      onConfirm: () => {
        store.deleteTask(t.id);
        setConfirm((c) => ({ ...c, open: false }));
        show("任务已删除");
      },
    });
  };

  const askDeletePlan = (pl: DailyPlan) => {
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
  };

  const renderPlan = (pl: DailyPlan) => {
    const projectColor = pl.projectId
      ? colorByKey(state.projects.find((p) => p.id === pl.projectId)?.color ?? "")
      : "var(--md-outline)";
    return (
      <div className="row gap-12" key={pl.id} style={{ padding: "6px 8px" }}>
        <label className="checkbox" style={{ margin: 0 }}>
          <input
            type="checkbox"
            checked={pl.done}
            onChange={() => store.updateDailyPlan(pl.id, { done: !pl.done })}
          />
        </label>
        <span className="dot" style={{ background: projectColor }} />
        <span
          className="body-md grow ellipsis"
          style={{ textDecoration: pl.done ? "line-through" : "none", opacity: pl.done ? 0.6 : 1 }}
        >
          {pl.name}
        </span>
        <span className="body-sm muted">{formatDate(pl.date)}</span>
        <span className="chip chip--small">{formatTime(pl.startTime).replace("上午 ", "").replace("下午 ", "")} - {formatTime(pl.endTime).replace("上午 ", "").replace("下午 ", "")}</span>
        <button className="icon-btn" onClick={() => setPlanForm({ open: true, projectId: pl.projectId, taskId: pl.taskId, lockProject: true, lockTask: true, editing: pl })} title="编辑">
          <Icon name="edit" size={18} />
        </button>
        <button className="icon-btn" onClick={() => askDeletePlan(pl)} title="删除">
          <Icon name="delete" size={18} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", paddingBottom: 96 }}>
      <div className="spread mb-16">
        <div>
          <div className="title-lg">我的项目</div>
          <div className="body-sm muted mt-8">
            {state.projects.length} 个项目 · {state.tasks.length} 个任务 · {state.dailyPlans.length} 个计划
          </div>
        </div>
        <button className="btn btn--tonal" onClick={() => setProjForm({ open: true, editing: null })}>
          <Icon name="add" size={18} /> 新建项目
        </button>
      </div>

      {state.projects.length === 0 ? (
        <EmptyState icon="space_dashboard" title="还没有项目" hint="点击「新建项目」开始规划你的工作" />
      ) : (
        <div className="col gap-12">
          {state.projects.map((p) => {
            const tasks = tasksOfProject.get(p.id) ?? [];
            const done = tasks.filter((t) => t.done).length;
            const status = statusLabel(p.startDate, p.endDate);
            const expanded = expandedProjects.has(p.id);
            const indep = independentPlans.get(p.id) ?? [];
            return (
              <div className="card" key={p.id}>
                <div
                  className="row gap-12"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleProject(p.id)}
                >
                  <span className="dot" style={{ background: colorByKey(p.color), width: 14, height: 14 }} />
                  <span className="title-md grow ellipsis">{p.name}</span>
                  <span className="chip chip--small">{status.text}</span>
                  <span className="body-sm muted">{relativeRangeLabel(p.startDate, p.endDate)}</span>
                  {tasks.length > 0 && (
                    <span className="body-sm muted">
                      {done}/{tasks.length}
                    </span>
                  )}
                  <button
                    className="icon-btn"
                    title="添加任务"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTaskForm({ open: true, projectId: p.id, editing: null });
                    }}
                  >
                    <Icon name="playlist_add" size={20} />
                  </button>
                  <button
                    className="icon-btn"
                    title="编辑项目"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProjForm({ open: true, editing: p });
                    }}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button className="icon-btn" title="删除项目" onClick={(e) => { e.stopPropagation(); askDeleteProject(p); }}>
                    <Icon name="delete" size={18} />
                  </button>
                  <Icon name={expanded ? "expand_less" : "expand_more"} size={22} className="muted" />
                </div>

                {expanded && (
                  <div className="mt-16 col gap-8">
                    {p.description && <p className="body-sm muted">{p.description}</p>}

                    <div className="spread mt-8">
                      <span className="label-lg muted">任务</span>
                      <button
                        className="btn btn--text btn--small"
                        onClick={() => setTaskForm({ open: true, projectId: p.id, editing: null })}
                      >
                        <Icon name="add" size={16} /> 添加任务
                      </button>
                    </div>

                    {tasks.length === 0 ? (
                      <div className="body-sm muted" style={{ padding: "8px 12px" }}>暂无任务</div>
                    ) : (
                      tasks.map((t) => {
                        const plans = plansOfTask.get(t.id) ?? [];
                        const tExpanded = expandedTasks.has(t.id);
                        const tStatus = statusLabel(t.startDate, t.endDate);
                        return (
                          <div
                            key={t.id}
                            style={{
                              background: "var(--md-surface-container)",
                              borderRadius: 12,
                              padding: "6px 8px",
                            }}
                          >
                            <div className="row gap-12" style={{ cursor: "pointer" }} onClick={() => toggleTask(t.id)}>
                              <label className="checkbox" style={{ margin: 0 }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={t.done}
                                  onChange={() => store.updateTask(t.id, { done: !t.done })}
                                />
                              </label>
                              <span className="dot" style={{ background: PRIORITY_COLOR[t.priority] }} title={`优先级：${t.priority}`} />
                              <span
                                className="body-md grow ellipsis"
                                style={{ textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1 }}
                              >
                                {t.name}
                              </span>
                              <span className="body-sm muted">{tStatus.text}</span>
                              <span className="body-sm muted">{relativeRangeLabel(t.startDate, t.endDate)}</span>
                              <button
                                className="icon-btn"
                                title="添加计划"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlanForm({ open: true, projectId: p.id, taskId: t.id, lockProject: true, lockTask: true, editing: null });
                                }}
                              >
                                <Icon name="add" size={20} />
                              </button>
                              <button className="icon-btn" title="编辑" onClick={(e) => { e.stopPropagation(); setTaskForm({ open: true, projectId: p.id, editing: t }); }}>
                                <Icon name="edit" size={18} />
                              </button>
                              <button className="icon-btn" title="删除" onClick={(e) => { e.stopPropagation(); askDeleteTask(t); }}>
                                <Icon name="delete" size={18} />
                              </button>
                              {plans.length > 0 && <Icon name={tExpanded ? "expand_less" : "expand_more"} size={20} className="muted" />}
                            </div>

                            {tExpanded && (
                              <div className="col gap-4" style={{ paddingLeft: 40, marginTop: 4 }}>
                                {t.description && <p className="body-sm muted">{t.description}</p>}
                                {plans.length === 0 ? (
                                  <div className="body-sm muted">暂无计划</div>
                                ) : (
                                  plans.map(renderPlan)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}

                    <div className="spread mt-8">
                      <span className="label-lg muted">独立计划（不挂在任务下）</span>
                      <button
                        className="btn btn--text btn--small"
                        onClick={() => setPlanForm({ open: true, projectId: p.id, taskId: null, lockProject: true, lockTask: true, editing: null })}
                      >
                        <Icon name="add" size={16} /> 添加计划
                      </button>
                    </div>
                    {indep.length === 0 ? (
                      <div className="body-sm muted" style={{ padding: "8px 12px" }}>暂无独立计划</div>
                    ) : (
                      <div className="col" style={{ paddingLeft: 16 }}>{indep.map(renderPlan)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FAB */}
      <button className="fab" style={{ right: 24, bottom: 24 }} onClick={() => setProjForm({ open: true, editing: null })} title="新建项目">
        <Icon name="add" />
      </button>

      {/* Dialogs */}
      <Dialog open={projForm.open} onClose={() => setProjForm((s) => ({ ...s, open: false }))} title={projForm.editing ? "编辑项目" : "新建项目"}>
        <ProjectForm
          initial={projForm.editing}
          onCancel={() => setProjForm((s) => ({ ...s, open: false }))}
          onSubmit={(input) => {
            if (projForm.editing) {
              store.updateProject(projForm.editing.id, input);
              show("项目已更新");
            } else {
              store.addProject(input);
              show("项目已创建");
            }
            setProjForm((s) => ({ ...s, open: false }));
          }}
        />
      </Dialog>

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
