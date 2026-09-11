import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  dailyPlanRepeatLabel,
  formatDate,
  formatDateFull,
  monthLabel,
  parseISODate,
  relativeRangeLabel,
  toISODate,
  todayISO,
  weekdayCN,
  type DailyPlan,
  type Priority,
  type Project,
  type Task,
} from "@task-orbit/core";
import { Icon } from "../components/Icon";
import { DailyPlanForm, ProjectForm, TaskForm } from "../components/forms";
import { ProjectNotesPanel } from "../components/ProjectNotesPanel";
import {
  Checkbox,
  IconButton,
  LinearProgress,
  Ripple,
  SecondaryTab,
  Tabs,
  TextButton,
} from "../components/material";
import {
  Badge,
  ConfirmDialog,
  Dialog,
  EmptyState,
  ExtendedFab,
  SearchBar,
  SectionHeader,
  StatCard,
  useSnackbar,
} from "../components/ui";
import { colorByKey } from "../store/colors";
import { useStore } from "../store/store";

const PRIORITY_COLOR: Record<Priority, string> = {
  high: "var(--md-error)",
  medium: "var(--color-warning)",
  low: "var(--color-success)",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: "高优先级",
  medium: "中优先级",
  low: "低优先级",
};

const PROJECT_TABS = [
  { key: "overview", label: "概览" },
  { key: "tasks", label: "任务与计划" },
  { key: "stats", label: "统计" },
  { key: "notes", label: "笔记" },
] as const;

type ProjectTab = (typeof PROJECT_TABS)[number]["key"];

function statusLabel(startISO: string, endISO: string): { text: string; color: string } {
  const today = todayISO();
  if (today < startISO) return { text: "未开始", color: "var(--md-on-surface-variant)" };
  if (today > endISO) return { text: "已结束", color: "var(--md-outline)" };
  return { text: "进行中", color: "var(--md-primary)" };
}

function monthDays(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function daysRemaining(endISO: string): number {
  const diff = parseISODate(endISO).getTime() - parseISODate(todayISO()).getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function ProjectsView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();
  const activeProjects = useMemo(
    () => state.projects.filter((project) => !project.archived),
    [state.projects],
  );
  const archivedProjects = useMemo(
    () => state.projects.filter((project) => project.archived),
    [state.projects],
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [planDate, setPlanDate] = useState(todayISO());
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
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  useEffect(() => {
    if (activeProjects.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    if (!selectedProjectId || !activeProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [activeProjects, selectedProjectId]);

  const selectedProject = activeProjects.find((project) => project.id === selectedProjectId) ?? null;

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return activeProjects;
    return activeProjects.filter((project) => {
      return `${project.name} ${project.description}`.toLocaleLowerCase().includes(query);
    });
  }, [activeProjects, searchQuery]);

  const tasksOfProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of state.tasks) {
      const list = map.get(task.projectId) ?? [];
      list.push(task);
      map.set(task.projectId, list);
    }
    return map;
  }, [state.tasks]);

  const plansOfTask = useMemo(() => {
    const map = new Map<string, DailyPlan[]>();
    for (const plan of state.dailyPlans) {
      if (!plan.taskId) continue;
      const list = map.get(plan.taskId) ?? [];
      list.push(plan);
      map.set(plan.taskId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`));
    }
    return map;
  }, [state.dailyPlans]);

  const projectTasks = selectedProject ? tasksOfProject.get(selectedProject.id) ?? [] : [];
  const projectPlans = useMemo(() => {
    if (!selectedProject) return [];
    return state.dailyPlans
      .filter((plan) => plan.projectId === selectedProject.id)
      .sort((a, b) => `${a.date}-${a.startTime}`.localeCompare(`${b.date}-${b.startTime}`));
  }, [selectedProject, state.dailyPlans]);
  const standalonePlans = useMemo(() => {
    return projectPlans.filter((plan) => !plan.taskId);
  }, [projectPlans]);
  const todayPlans = projectPlans.filter((plan) => plan.date === planDate);
  const planDayTitle = planDate === todayISO() ? "今日计划" : "当天计划";
  const doneTasks = projectTasks.filter((task) => task.done).length;
  const donePlans = projectPlans.filter((plan) => plan.done).length;
  const taskProgress = projectTasks.length ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
  const planProgress = projectPlans.length ? Math.round((donePlans / projectPlans.length) * 100) : 0;
  const calendarDays = useMemo(() => monthDays(parseISODate(planDate)), [planDate]);
  const projectPlanDates = useMemo(
    () => new Set(projectPlans.map((plan) => plan.date)),
    [projectPlans],
  );

  const toggleTask = (id: string) => {
    setExpandedTasks((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectProject = (id: string) => {
    setSelectedProjectId(id);
    setActiveTab("overview");
    setExpandedTasks(new Set());
  };

  const openNewTask = (projectId: string) => {
    setTaskForm({ open: true, projectId, editing: null });
  };

  const openNewPlan = (projectId: string, taskId: string | null = null, date = planDate) => {
    setPlanForm({
      open: true,
      projectId,
      taskId,
      lockProject: true,
      lockTask: Boolean(taskId),
      defaultDate: date,
      editing: null,
    });
    if (taskId) {
      setExpandedTasks((previous) => new Set(previous).add(taskId));
    }
  };

  const askArchiveProject = (project: Project) => {
    setConfirm({
      open: true,
      title: "归档项目",
      message: `确定归档项目「${project.name}」吗？归档后项目不会出现在活跃项目列表中，但其任务、计划和历史记录会保留。`,
      confirmLabel: "归档",
      onConfirm: () => {
        store.archiveProject(project.id);
        setConfirm((current) => ({ ...current, open: false }));
        show("项目已归档");
      },
    });
  };

  const askPermanentDeleteProject = (project: Project) => {
    setConfirm({
      open: true,
      title: "永久删除项目",
      message: `确定永久删除项目「${project.name}」吗？其下的任务与计划也会被删除，此操作不可恢复。历史番茄钟记录会保留，但不再属于活跃项目。`,
      confirmLabel: "永久删除",
      danger: true,
      onConfirm: () => {
        store.deleteProject(project.id);
        setConfirm((current) => ({ ...current, open: false }));
        show("项目已永久删除");
      },
    });
  };

  const askDeleteTask = (task: Task) => {
    setConfirm({
      open: true,
      title: "删除任务",
      message: `确定删除任务「${task.name}」吗？其下的每日计划也会一并删除。`,
      onConfirm: () => {
        store.deleteTask(task.id);
        setConfirm((current) => ({ ...current, open: false }));
        show("任务已删除");
      },
    });
  };

  const askDeletePlan = (plan: DailyPlan) => {
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
  };

  const renderPlanRow = (plan: DailyPlan, compact = false) => {
    const task = plan.taskId ? state.tasks.find((item) => item.id === plan.taskId) : null;
    const projectColor = selectedProject ? colorByKey(selectedProject.color) : "var(--md-outline)";
    return (
      <div className={`project-plan-row ${compact ? "project-plan-row--compact" : ""} ${plan.done ? "is-done" : ""}`} key={plan.id}>
        <Checkbox
          checked={plan.done}
          aria-label={`标记计划「${plan.name}」${plan.done ? "未完成" : "已完成"}`}
          onChange={() => store.updateDailyPlan(plan.id, { done: !plan.done })}
        />
        <span className="dot project-plan-row__dot" style={{ background: projectColor }} />
        <div className="project-plan-row__copy">
          <div className="body-md project-plan-row__name">{plan.name}</div>
          <div className="body-sm muted project-plan-row__meta">
            {formatDate(plan.date)}
            {plan.recurrence.frequency !== "none" && ` · ${dailyPlanRepeatLabel(plan.recurrence.frequency)}`}
            {!compact && task && ` · ${task.name}`}
          </div>
        </div>
        <span className="chip chip--small project-time-chip">
          {plan.startTime} - {plan.endTime}
        </span>
        <div className="project-row-actions">
          <IconButton
            aria-label="编辑计划"
            title="编辑计划"
            onClick={() => setPlanForm({
              open: true,
              projectId: plan.projectId,
              taskId: plan.taskId,
              lockProject: true,
              lockTask: Boolean(plan.taskId),
              editing: plan,
            })}
          >
            <Icon name="edit" size={18} />
          </IconButton>
          <IconButton aria-label="删除计划" title="删除计划" onClick={() => askDeletePlan(plan)}>
            <Icon name="delete" size={18} />
          </IconButton>
        </div>
      </div>
    );
  };

  const renderTask = (task: Task) => {
    const taskPlans = plansOfTask.get(task.id) ?? [];
    const doneCount = taskPlans.filter((plan) => plan.done).length;
    const expanded = expandedTasks.has(task.id);
    const taskStatus = statusLabel(task.startDate, task.endDate);
    return (
      <div className={`project-task-item ${task.done ? "is-done" : ""}`} key={task.id}>
        <div className="project-task-row" onClick={() => toggleTask(task.id)}>
          <Checkbox
            checked={task.done}
            aria-label={`标记任务「${task.name}」${task.done ? "未完成" : "已完成"}`}
            onClick={(event) => event.stopPropagation()}
            onChange={() => store.updateTask(task.id, { done: !task.done })}
          />
          <span
            className="dot project-task-row__priority"
            style={{ background: PRIORITY_COLOR[task.priority] }}
            title={PRIORITY_LABEL[task.priority]}
          />
          <div className="project-task-row__copy">
            <span className="body-md project-task-row__name">{task.name}</span>
            {task.description && <span className="body-sm muted project-task-row__description">{task.description}</span>}
          </div>
          {taskPlans.length > 0 && (
            <span className="chip chip--small project-plan-count-chip" title={`关联 ${taskPlans.length} 个计划，已完成 ${doneCount} 个`}>
              <Icon name="calendar_today" size={13} />
              <span>{doneCount}/{taskPlans.length}</span>
            </span>
          )}
          <span className="chip chip--small project-status-chip" style={{ color: taskStatus.color }}>
            {taskStatus.text}
          </span>
          <span className="body-sm muted project-task-row__date">{relativeRangeLabel(task.startDate, task.endDate)}</span>
          <div className="project-row-actions">
            <IconButton
              aria-label="添加计划"
              title="添加计划"
              onClick={(event) => {
                event.stopPropagation();
                if (selectedProject) openNewPlan(selectedProject.id, task.id);
              }}
            >
              <Icon name="add" size={19} />
            </IconButton>
            <IconButton
              aria-label="编辑任务"
              title="编辑任务"
              onClick={(event) => {
                event.stopPropagation();
                setTaskForm({ projectId: task.projectId, editing: task, open: true });
              }}
            >
              <Icon name="edit" size={18} />
            </IconButton>
            <IconButton
              aria-label="删除任务"
              title="删除任务"
              onClick={(event) => {
                event.stopPropagation();
                askDeleteTask(task);
              }}
            >
              <Icon name="delete" size={18} />
            </IconButton>
            {taskPlans.length > 0 && <Icon name={expanded ? "expand_less" : "expand_more"} size={20} className="muted" />}
          </div>
        </div>
        {taskPlans.length > 0 && (
          <div className={`project-task-plans ${expanded ? "is-open" : ""}`}>
            <div className="project-task-plans__inner">
              {taskPlans.map((plan) => renderPlanRow(plan, true))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTaskSection = (showAll = true) => (
    <section className="project-panel" id="project-tasks">
      <SectionHeader
        title={showAll ? "任务与计划" : "任务"}
        subtitle={showAll ? "拆解执行步骤与每日日程" : "把项目拆成可执行的下一步"}
        badge={<Badge value={projectTasks.length} variant="primary" />}
        actions={
          <div className="row gap-8">
            <TextButton onClick={() => selectedProject && openNewTask(selectedProject.id)}>
              <Icon name="add" size={18} slot="icon" /> 添加任务
            </TextButton>
            {showAll && (
              <TextButton onClick={() => selectedProject && openNewPlan(selectedProject.id, null)}>
                <Icon name="calendar_add_on" size={18} slot="icon" /> 添加独立计划
              </TextButton>
            )}
          </div>
        }
      />
      {projectTasks.length === 0 && (!showAll || standalonePlans.length === 0) ? (
        <div className="project-empty-row">
          <Icon name="checklist" size={24} />
          <span>还没有任务或计划，先添加一个目标吧。</span>
        </div>
      ) : (
        <div className="project-task-list">
          {(showAll ? projectTasks : projectTasks.slice(0, 4)).map(renderTask)}
          {!showAll && projectTasks.length > 4 && (
            <button type="button" className="project-list-footer" onClick={() => setActiveTab("tasks")}>
              查看全部 {projectTasks.length} 个任务 <Icon name="arrow_forward" size={17} />
            </button>
          )}
        </div>
      )}
      {showAll && standalonePlans.length > 0 && (
        <div className="project-standalone-plans-section">
          <div className="project-standalone-plans-header">
            <div className="row gap-8">
              <span className="project-heading-icon project-heading-icon--primary">
                <Icon name="event_note" size={18} />
              </span>
              <span className="title-sm">独立计划（未关联任务）</span>
            </div>
            <span className="body-sm muted">{standalonePlans.length} 个计划</span>
          </div>
          <div className="project-plan-list">
            {standalonePlans.map((plan) => renderPlanRow(plan, false))}
          </div>
        </div>
      )}
    </section>
  );

  const renderTodayPlans = () => (
    <section className="project-panel today-plan-card" id="project-plans">
      <div className="project-panel-heading project-panel-heading--compact">
        <div className="row gap-8">
          <span className="project-heading-icon project-heading-icon--primary"><Icon name="event_note" size={20} /></span>
          <div className="title-md">{planDayTitle}</div>
        </div>
        <IconButton
          aria-label={`添加${planDayTitle}`}
          title={`添加${planDayTitle}`}
          onClick={() => selectedProject && openNewPlan(selectedProject.id, null, planDate)}
        >
          <Icon name="add" size={20} />
        </IconButton>
      </div>
      <button type="button" className="project-date-picker" onClick={() => setActiveTab("tasks")}>
        <Icon name="chevron_right" size={18} />
        <span>{formatDateFull(planDate)}</span>
      </button>
      <div className="today-plan-list">
        {todayPlans.length === 0 ? (
          <div className="project-empty-row project-empty-row--small">{planDayTitle}还没有安排计划。</div>
        ) : (
          todayPlans.slice(0, 3).map((plan) => (
            <button
              type="button"
              className={`today-plan-item ${plan.done ? "is-done" : ""}`}
              key={plan.id}
              onClick={() => setPlanForm({
                open: true,
                projectId: plan.projectId,
                taskId: plan.taskId,
                lockProject: true,
                lockTask: true,
                editing: plan,
              })}
            >
              <span className="chip chip--small today-plan-item__time">{plan.startTime} - {plan.endTime}</span>
              <span className="title-sm today-plan-item__name">{plan.name}</span>
              <span className="row gap-6 body-sm muted">
                <span className="dot" style={{ background: selectedProject ? colorByKey(selectedProject.color) : "var(--md-outline)" }} />
                {plan.taskId ? state.tasks.find((task) => task.id === plan.taskId)?.name ?? "项目任务" : "独立计划"}
              </span>
            </button>
          ))
        )}
      </div>
      {todayPlans.length > 3 && (
        <button type="button" className="project-card-link" onClick={() => setActiveTab("tasks")}>
          查看{planDayTitle}全部计划 <Icon name="arrow_forward" size={17} />
        </button>
      )}
    </section>
  );

  const shiftPlanMonth = (offset: number) => {
    const current = parseISODate(planDate);
    const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
    setPlanDate(toISODate(next));
  };

  const renderCalendar = () => {
    const currentMonth = parseISODate(planDate).getMonth();
    return (
      <section className="project-panel project-calendar-card">
        <div className="project-calendar-header">
          <div className="title-sm">日历</div>
          <div className="row gap-4">
            <span className="body-md muted">{monthLabel(parseISODate(planDate))}</span>
            <IconButton aria-label="上个月" title="上个月" onClick={() => shiftPlanMonth(-1)}>
              <Icon name="chevron_left" size={19} />
            </IconButton>
            <IconButton aria-label="下个月" title="下个月" onClick={() => shiftPlanMonth(1)}>
              <Icon name="chevron_right" size={19} />
            </IconButton>
          </div>
        </div>
        <div className="project-calendar-weekdays">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="project-calendar-grid">
          {calendarDays.map((day) => {
            const iso = toISODate(day);
            const selected = iso === planDate;
            const outside = day.getMonth() !== currentMonth;
            return (
              <button
                type="button"
                key={iso}
                className={`project-calendar-day ${selected ? "is-selected" : ""} ${outside ? "is-outside" : ""}`}
                onClick={() => setPlanDate(iso)}
              >
                <span>{day.getDate()}</span>
                {projectPlanDates.has(iso) && <i />}
              </button>
            );
          })}
        </div>
      </section>
    );
  };

  const renderStatsTab = () => (
    <section className="project-panel project-stats-card">
      <SectionHeader
        title="项目统计"
        subtitle="持续推进，及时看见进展"
      />
      <div className="project-stat-detail-grid">
        <div><span className="body-sm muted">任务完成率</span><strong>{taskProgress}%</strong><LinearProgress value={taskProgress} max={100} /></div>
        <div><span className="body-sm muted">计划完成率</span><strong>{planProgress}%</strong><LinearProgress className="progress--success" value={planProgress} max={100} /></div>
        <div><span className="body-sm muted">剩余天数</span><strong>{daysRemaining(selectedProject?.endDate ?? todayISO())}<small> 天</small></strong><span className="body-sm muted">预计 {formatDate(selectedProject?.endDate ?? todayISO())} 结束</span></div>
      </div>
      <div className="project-stat-breakdown">
        <div className="spread"><span className="body-md">已完成任务</span><span className="body-md muted">{doneTasks} / {projectTasks.length}</span></div>
        <div className="spread"><span className="body-md">已完成计划</span><span className="body-md muted">{donePlans} / {projectPlans.length}</span></div>
        <div className="spread"><span className="body-md">项目周期</span><span className="body-md muted">{selectedProject ? relativeRangeLabel(selectedProject.startDate, selectedProject.endDate) : "-"}</span></div>
      </div>
    </section>
  );

  const renderMainContent = () => {
    if (!selectedProject) return null;
    if (activeTab === "tasks") return renderTaskSection();
    if (activeTab === "stats") return renderStatsTab();
    if (activeTab === "notes") return <ProjectNotesPanel project={selectedProject} state={state} />;
    return (
      <div className="project-overview-grid">
        <div className="project-overview-main">
          <section className="project-overview-section">
            <SectionHeader title="项目概览" />
            <div className="project-stat-grid">
              <StatCard
                title="任务总数"
                value={projectTasks.length}
                subtitle={<>{doneTasks} 已完成</>}
                icon="task_alt"
                colorVariant="primary"
                onClick={() => setActiveTab("tasks")}
              />
              <StatCard
                title="计划总数"
                value={projectPlans.length}
                subtitle={<>{planDate === todayISO() ? "今日计划" : `${formatDate(planDate)}计划`} {todayPlans.length} 个</>}
                icon="event_available"
                colorVariant="info"
                onClick={() => setActiveTab("tasks")}
              />
              <StatCard
                title="整体进度"
                value={taskProgress}
                unit="%"
                subtitle="任务完成率"
                icon="trending_up"
                colorVariant="success"
              />
              <StatCard
                title="预计剩余"
                value={daysRemaining(selectedProject.endDate)}
                unit="天"
                subtitle={`预计 ${formatDate(selectedProject.endDate)} 结束`}
                icon="schedule"
                colorVariant="warning"
              />
            </div>
          </section>
          {renderTaskSection(false)}
        </div>
        <aside className="project-overview-sidebar">
          {renderTodayPlans()}
          {renderCalendar()}
        </aside>
      </div>
    );
  };

  return (
    <div className="projects-workspace">
      <aside className="projects-sidebar">
        <div className="projects-sidebar__header">
          <div className="headline-sm">项目</div>
          <button type="button" className="projects-sidebar__manage" onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "收起" : "管理"}
          </button>
        </div>

        <div className="projects-sidebar__tools">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="搜索项目..."
            className="projects-search-bar"
          />
        </div>

        <ExtendedFab
          label="新建项目"
          icon="add"
          variant="primary"
          className="projects-create-fab"
          onClick={() => setProjForm({ open: true, editing: null })}
        />

        <div className="projects-sidebar__list">
          {filteredProjects.length === 0 ? (
            <div className="projects-sidebar__empty">{activeProjects.length === 0 ? "还没有项目" : "没有匹配的项目"}</div>
          ) : (
            filteredProjects.map((project) => {
              const tasks = tasksOfProject.get(project.id) ?? [];
              const taskDone = tasks.filter((task) => task.done).length;
              const selected = selectedProjectId === project.id;
              return (
                <button
                  type="button"
                  className={`project-nav-item ${selected ? "is-selected" : ""}`}
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                >
                  <span className="dot project-nav-item__dot" style={{ background: colorByKey(project.color) }} />
                  <span className="project-nav-item__body">
                    <span className="title-md ellipsis">{project.name}</span>
                    <span className="body-sm muted project-nav-item__meta">
                      {tasks.length > 0 ? `${taskDone} / ${tasks.length} 个任务完成` : "暂无任务"}
                      <span>{relativeRangeLabel(project.startDate, project.endDate)}</span>
                    </span>
                  </span>
                  {selected && <Icon name="chevron_right" size={19} className="project-nav-item__chevron" />}
                  <Ripple />
                </button>
              );
            })
          )}
        </div>

        {archivedProjects.length > 0 && (
          <div className="projects-sidebar__archived">
            <button type="button" className="projects-archived-toggle" onClick={() => setShowArchived((value) => !value)}>
              <span>已归档项目</span>
              <span className="row gap-4"><span className="body-sm muted">{archivedProjects.length}</span><Icon name={showArchived ? "expand_less" : "chevron_right"} size={18} /></span>
            </button>
            {showArchived && (
              <div className="projects-archived-list">
                {archivedProjects.map((project) => (
                  <div className="projects-archived-item" key={project.id}>
                    <span className="dot" style={{ background: colorByKey(project.color) }} />
                    <span className="body-sm ellipsis grow">{project.name}</span>
                    <IconButton aria-label={`恢复项目${project.name}`} title="恢复项目" onClick={() => { store.restoreProject(project.id); show("项目已恢复"); }}><Icon name="unarchive" size={17} /></IconButton>
                    <IconButton aria-label={`永久删除项目${project.name}`} title="永久删除项目" onClick={() => askPermanentDeleteProject(project)}><Icon name="delete_forever" size={17} /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      <main className="project-detail-area">
        {!selectedProject ? (
          <div className="project-detail-empty">
            <EmptyState icon="space_dashboard" title="还没有项目" hint="点击左侧「新建项目」开始规划你的工作" />
          </div>
        ) : (
          <div className="project-detail-surface">
            <header className="project-hero">
              <div className="project-hero__identity">
                <div className="project-hero__title-row">
                  <span className="project-hero__dot" style={{ background: colorByKey(selectedProject.color) }} />
                  <h1>{selectedProject.name}</h1>
                  <span className="chip project-hero__status"><span className="project-status-pulse" />{statusLabel(selectedProject.startDate, selectedProject.endDate).text}</span>
                </div>
                <div className="project-hero__date body-md muted"><Icon name="calendar_today" size={18} /> {formatDateFull(selectedProject.startDate)} - {formatDate(selectedProject.endDate)}</div>
                {selectedProject.description && <p className="body-md muted project-hero__description">{selectedProject.description}</p>}
              </div>
              <div className="project-hero__progress">
                <div className="spread"><span className="label-md">整体进度</span><strong>{taskProgress}%</strong></div>
                <LinearProgress value={taskProgress} max={100} aria-label="项目整体进度" />
                <div className="body-sm muted mt-8">{doneTasks} / {projectTasks.length} 个任务完成</div>
              </div>
              <div className="project-hero__actions">
                <button type="button" className="project-share-button" onClick={() => show("分享功能即将推出")}><Icon name="share" size={19} /> 分享</button>
                <IconButton aria-label="编辑项目" title="编辑项目" onClick={() => setProjForm({ open: true, editing: selectedProject })}><Icon name="edit" size={19} /></IconButton>
                <IconButton aria-label="归档项目" title="归档项目" onClick={() => askArchiveProject(selectedProject)}><Icon name="more_vert" size={20} /></IconButton>
              </div>
            </header>

            <Tabs
              className="project-tabs-md"
              activeTabIndex={Math.max(0, PROJECT_TABS.findIndex((tab) => tab.key === activeTab))}
              onChange={(event) => {
                const index = (event.currentTarget as HTMLElement & { activeTabIndex: number })
                  .activeTabIndex;
                const next = PROJECT_TABS[index];
                if (next) setActiveTab(next.key);
              }}
            >
              {PROJECT_TABS.map((tab) => (
                <SecondaryTab key={tab.key}>{tab.label}</SecondaryTab>
              ))}
            </Tabs>

            <div className="project-detail-content">{renderMainContent()}</div>
          </div>
        )}
      </main>

      <Dialog open={projForm.open} onClose={() => setProjForm((current) => ({ ...current, open: false }))} title={projForm.editing ? "编辑项目" : "新建项目"}>
        <ProjectForm
          initial={projForm.editing}
          onCancel={() => setProjForm((current) => ({ ...current, open: false }))}
          onSubmit={(input) => {
            if (projForm.editing) {
              store.updateProject(projForm.editing.id, input);
              show("项目已更新");
            } else {
              const project = store.addProject(input);
              setSelectedProjectId(project.id);
              show("项目已创建");
            }
            setProjForm((current) => ({ ...current, open: false }));
          }}
        />
      </Dialog>

      <Dialog open={taskForm.open} onClose={() => setTaskForm((current) => ({ ...current, open: false }))} title={taskForm.editing ? "编辑任务" : "新建任务"}>
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

      <Dialog open={planForm.open} onClose={() => setPlanForm((current) => ({ ...current, open: false }))} title={planForm.editing ? "编辑计划" : "新建每日计划"}>
        <DailyPlanForm
          initial={planForm.editing}
          defaultProjectId={planForm.projectId}
          defaultTaskId={planForm.taskId}
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
            const targetTaskId = input.taskId;
            if (targetTaskId) {
              setExpandedTasks((prev) => new Set(prev).add(targetTaskId));
            }
            setPlanDate(input.date);
            setPlanForm((current) => ({ ...current, open: false }));
          }}
        />
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        danger={confirm.danger}
        onCancel={() => setConfirm((current) => ({ ...current, open: false }))}
        onConfirm={confirm.onConfirm}
      />
    </div>
  );
}
