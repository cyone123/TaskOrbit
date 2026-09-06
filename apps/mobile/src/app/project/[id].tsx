import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addDays,
  dailyPlanRepeatLabel,
  formatDateFull,
  relativeRangeLabel,
  toISODate,
  todayISO,
  type DailyPlan,
  type DailyPlanRepeat,
  type Priority,
  type Project,
  type Task,
} from "@task-orbit/core";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppScreen,
  AssistChip,
  Card,
  ChoiceRow,
  EmptyState,
  FAB,
  Field,
  FormModal,
  IconButton,
  MD3Checkbox,
  PageScroll,
  ProgressBar,
  SegmentedControl,
} from "@/components/ui";
import { MD3Shape, MD3Typography, useAppColors } from "@/constants/theme";
import { calculateProjectMetrics } from "@/features/project-metrics";
import { PRIORITY_LABEL, PROJECT_COLORS, PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

type DetailSection = "tasks" | "stats";

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useAppColors();
  const store = useAppStore();
  const { state } = store;
  const project = state.projects.find((item) => item.id === id);
  const [section, setSection] = useState<DetailSection>("tasks");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskForm, setTaskForm] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null });
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStart, setTaskStart] = useState(todayISO());
  const [taskEnd, setTaskEnd] = useState(toISODate(addDays(new Date(), 14)));
  const [priority, setPriority] = useState<Priority>("medium");
  const [planForm, setPlanForm] = useState<{ open: boolean; editing: DailyPlan | null }>({ open: false, editing: null });
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planDate, setPlanDate] = useState(todayISO());
  const [planStart, setPlanStart] = useState("09:00");
  const [planEnd, setPlanEnd] = useState("10:00");
  const [planTaskId, setPlanTaskId] = useState("");
  const [repeat, setRepeat] = useState<DailyPlanRepeat>("none");
  const [repeatCount, setRepeatCount] = useState("4");
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [projectColor, setProjectColor] = useState("violet");

  const tasks = useMemo(() => state.tasks.filter((task) => task.projectId === id), [id, state.tasks]);
  const plans = useMemo(() => state.dailyPlans.filter((plan) => plan.projectId === id).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [id, state.dailyPlans]);
  const metrics = useMemo(() => calculateProjectMetrics(state, id ?? ""), [id, state]);
  const goToProjects = () => { if (router.canGoBack()) router.back(); else router.replace("/projects"); };

  if (!project) {
    return <AppScreen title="项目不存在" leading={<IconButton icon="arrow-back" label="返回项目" onPress={goToProjects} variant="standard" />}><EmptyState icon="folder-open-outline" title="找不到这个项目" description="项目可能已经被删除，返回项目列表继续。" /></AppScreen>;
  }

  const accent = PROJECT_COLOR_HEX[project.color] ?? colors.primary;
  const resetTaskForm = () => { setTaskForm({ open: false, editing: null }); setTaskName(""); setTaskDescription(""); setTaskStart(project.startDate); setTaskEnd(project.endDate); setPriority("medium"); };
  const openNewTask = () => { resetTaskForm(); setTaskStart(todayISO() < project.startDate ? project.startDate : todayISO()); setTaskEnd(project.endDate); setTaskForm({ open: true, editing: null }); };
  const openEditTask = (task: Task) => { setTaskName(task.name); setTaskDescription(task.description); setTaskStart(task.startDate); setTaskEnd(task.endDate); setPriority(task.priority); setTaskForm({ open: true, editing: task }); };
  const toggleTaskExpand = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };
  const submitTask = () => {
    if (!taskName.trim() || !validDateRange(taskStart, taskEnd)) { Alert.alert("无法保存任务", "请填写名称，并确认日期为有效的 YYYY-MM-DD 范围。"); return; }
    const input = { name: taskName.trim(), description: taskDescription.trim(), startDate: taskStart, endDate: taskEnd, priority };
    if (taskForm.editing) store.updateTask(taskForm.editing.id, input); else store.addTask({ ...input, projectId: project.id });
    resetTaskForm();
  };

  const resetPlanForm = () => { setPlanForm({ open: false, editing: null }); setPlanName(""); setPlanDescription(""); setPlanDate(todayISO()); setPlanStart("09:00"); setPlanEnd("10:00"); setPlanTaskId(""); setRepeat("none"); setRepeatCount("4"); };
  const openNewPlan = (taskId = "") => { resetPlanForm(); setPlanTaskId(taskId); setPlanForm({ open: true, editing: null }); };
  const openEditPlan = (plan: DailyPlan) => { setPlanName(plan.name); setPlanDescription(plan.description); setPlanDate(plan.date); setPlanStart(plan.startTime); setPlanEnd(plan.endTime); setPlanTaskId(plan.taskId ?? ""); setPlanForm({ open: true, editing: plan }); };
  const submitPlan = () => {
    const count = Number.parseInt(repeatCount, 10);
    if (!planName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(planDate) || !validTimeRange(planStart, planEnd)) { Alert.alert("无法保存计划", "请填写名称、有效日期，以及结束晚于开始的 HH:mm 时间。"); return; }
    if (!planForm.editing && repeat !== "none" && (!Number.isFinite(count) || count < 2 || count > 365)) { Alert.alert("重复次数无效", "重复次数需要在 2 到 365 之间。"); return; }
    const estimatedMinutes = timeMinutes(planEnd) - timeMinutes(planStart);
    if (planForm.editing) {
      store.updatePlan(planForm.editing.id, { projectId: project.id, taskId: planTaskId || null, name: planName.trim(), description: planDescription.trim(), date: planDate, startTime: planStart, endTime: planEnd, estimatedMinutes });
    } else {
      store.addPlans({ projectId: project.id, taskId: planTaskId || null, name: planName.trim(), description: planDescription.trim(), date: planDate, startTime: planStart, endTime: planEnd, estimatedMinutes, repeat, repeatCount: repeat === "none" ? 1 : count });
      if (planTaskId) setExpandedTasks((prev) => new Set(prev).add(planTaskId));
    }
    resetPlanForm();
  };

  const openProjectForm = () => { setProjectName(project.name); setProjectDescription(project.description); setProjectStart(project.startDate); setProjectEnd(project.endDate); setProjectColor(project.color); setProjectFormOpen(true); };
  const submitProject = () => {
    if (!projectName.trim() || !validDateRange(projectStart, projectEnd)) { Alert.alert("无法保存项目", "请填写名称，并确认日期范围有效。"); return; }
    store.updateProject(project.id, { name: projectName.trim(), description: projectDescription.trim(), startDate: projectStart, endDate: projectEnd, color: projectColor }); setProjectFormOpen(false);
  };

  return (
    <AppScreen
      title={project.name}
      subtitle={relativeRangeLabel(project.startDate, project.endDate)}
      leading={<IconButton icon="arrow-back" label="返回项目" onPress={goToProjects} variant="standard" />}
      action={<IconButton icon="create-outline" label="编辑项目" onPress={openProjectForm} variant="tonal" />}
    >
      <PageScroll key={section}>
        <Card variant="filled" style={[styles.hero, { backgroundColor: colors.surfaceContainerHigh }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: `${accent}24` }]}><Ionicons name="folder-open" size={26} color={accent} /></View>
            <View style={styles.heroCopy}><Text style={[styles.heroTitle, { color: colors.onSurface }]}>{project.name}</Text><Text style={[styles.heroDate, { color: colors.onSurfaceVariant }]}>{formatDateFull(project.startDate)} — {formatDateFull(project.endDate)}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="归档项目" onPress={() => confirmAction("归档项目", `归档「${project.name}」？归档后可在项目列表恢复。`, () => { store.archiveProject(project.id); goToProjects(); })} style={[styles.archiveButton, { backgroundColor: colors.surfaceContainer }]}><Ionicons name="archive-outline" size={20} color={colors.onSurfaceVariant} /></Pressable>
          </View>
          {project.description ? <Text style={[styles.heroDescription, { color: colors.onSurfaceVariant }]}>{project.description}</Text> : null}
          <View style={styles.heroProgressLabel}><Text style={[styles.heroProgressText, { color: colors.onSurface }]}>整体进度</Text><Text style={[styles.heroProgressValue, { color: accent }]}>{metrics.taskProgress}%</Text></View>
          <ProgressBar value={metrics.taskProgress} color={accent} />
          <Text style={[styles.heroProgressMeta, { color: colors.onSurfaceVariant }]}>{metrics.taskDone} / {metrics.taskTotal} 个任务完成</Text>
        </Card>

        <SegmentedControl value={section} onChange={(value) => setSection(value as DetailSection)} options={[
          { value: "tasks", label: `任务与计划 ${metrics.taskTotal}`, icon: "checkmark-done-outline" },
          { value: "stats", label: "统计", icon: "analytics-outline" },
        ]} />

        {section === "tasks" ? (
          <TaskSection
            tasks={tasks}
            plans={plans}
            accent={accent}
            expandedTasks={expandedTasks}
            onToggleExpand={toggleTaskExpand}
            onAdd={openNewTask}
            onEdit={openEditTask}
            onAddPlan={(taskId) => openNewPlan(taskId)}
            onEditPlan={openEditPlan}
            onDeletePlan={(plan) =>
              confirmAction("删除计划", `确定删除计划「${plan.name}」？`, () =>
                store.removePlan(plan.id),
              )
            }
            onTogglePlan={(plan) => store.togglePlan(plan.id, !plan.done)}
            onToggle={(task) => store.toggleTask(task.id, !task.done)}
            onDelete={(task) =>
              confirmAction("删除任务", `确定删除「${task.name}」及关联的每日计划？`, () =>
                store.removeTask(task.id),
              )
            }
          />
        ) : null}
        {section === "stats" ? <StatsSection metrics={metrics} project={project} accent={accent} /> : null}
      </PageScroll>

      {section === "tasks" ? <FAB icon="add" label="添加任务" onPress={openNewTask} /> : null}

      <FormModal visible={taskForm.open} title={taskForm.editing ? "编辑任务" : "添加任务"} onClose={resetTaskForm} onSubmit={submitTask} canSubmit={Boolean(taskName.trim())}>
        <Field label="任务名称" value={taskName} onChangeText={setTaskName} placeholder="例如：完成项目详情页" />
        <Field label="说明（可选）" value={taskDescription} onChangeText={setTaskDescription} placeholder="写下验收标准" multiline />
        <View style={styles.formRow}><View style={styles.flex}><Field label="开始日期" value={taskStart} onChangeText={setTaskStart} placeholder="YYYY-MM-DD" /></View><View style={styles.flex}><Field label="结束日期" value={taskEnd} onChangeText={setTaskEnd} placeholder="YYYY-MM-DD" /></View></View>
        <ChoiceRow label="优先级" value={priority} onChange={(value) => setPriority(value as Priority)} options={[{ value: "low", label: "低" }, { value: "medium", label: "中" }, { value: "high", label: "高" }]} />
      </FormModal>

      <FormModal visible={planForm.open} title={planForm.editing ? "编辑每日计划" : "添加每日计划"} onClose={resetPlanForm} onSubmit={submitPlan} canSubmit={Boolean(planName.trim())}>
        <Field label="计划名称" value={planName} onChangeText={setPlanName} placeholder="例如：完成交互走查" />
        <Field label="说明（可选）" value={planDescription} onChangeText={setPlanDescription} placeholder="这段时间要完成什么？" multiline />
        <Field label="日期" value={planDate} onChangeText={setPlanDate} placeholder="YYYY-MM-DD" />
        <View style={styles.formRow}><View style={styles.flex}><Field label="开始时间" value={planStart} onChangeText={setPlanStart} placeholder="09:00" /></View><View style={styles.flex}><Field label="结束时间" value={planEnd} onChangeText={setPlanEnd} placeholder="10:00" /></View></View>
        <ChoiceRow label="关联任务（可选）" value={planTaskId} onChange={setPlanTaskId} options={[{ value: "", label: "独立计划" }, ...tasks.map((task) => ({ value: task.id, label: task.name }))]} />
        {!planForm.editing ? <ChoiceRow label="重复" value={repeat} onChange={(value) => setRepeat(value as DailyPlanRepeat)} options={[{ value: "none", label: "不重复" }, { value: "daily", label: "每天" }, { value: "weekly", label: "每周" }, { value: "monthly", label: "每月" }]} /> : null}
        {!planForm.editing && repeat !== "none" ? <Field label="重复次数（2-365）" value={repeatCount} onChangeText={setRepeatCount} keyboardType="number-pad" /> : null}
      </FormModal>

      <FormModal visible={projectFormOpen} title="编辑项目" onClose={() => setProjectFormOpen(false)} onSubmit={submitProject} canSubmit={Boolean(projectName.trim())}>
        <Field label="项目名称" value={projectName} onChangeText={setProjectName} />
        <Field label="项目说明" value={projectDescription} onChangeText={setProjectDescription} multiline />
        <View style={styles.formRow}><View style={styles.flex}><Field label="开始日期" value={projectStart} onChangeText={setProjectStart} /></View><View style={styles.flex}><Field label="结束日期" value={projectEnd} onChangeText={setProjectEnd} /></View></View>
        <ChoiceRow label="项目颜色" value={projectColor} onChange={setProjectColor} options={PROJECT_COLORS.map((item) => ({ value: item, label: item, color: PROJECT_COLOR_HEX[item] }))} />
      </FormModal>
    </AppScreen>
  );
}

function TaskSection({
  tasks,
  plans,
  accent,
  expandedTasks,
  onToggleExpand,
  onAdd: _onAdd,
  onEdit,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
  onToggle,
  onTogglePlan,
  onDelete,
}: {
  tasks: Task[];
  plans: DailyPlan[];
  accent: string;
  expandedTasks: Set<string>;
  onToggleExpand(taskId: string): void;
  onAdd(): void;
  onEdit(task: Task): void;
  onAddPlan(taskId: string): void;
  onEditPlan(plan: DailyPlan): void;
  onDeletePlan(plan: DailyPlan): void;
  onToggle(task: Task): void;
  onTogglePlan(plan: DailyPlan): void;
  onDelete(task: Task): void;
}) {
  const colors = useAppColors();
  const standalonePlans = plans.filter((plan) => !plan.taskId);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>任务与计划</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]}>
            {tasks.length} 个任务 · {plans.length} 个计划
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="添加独立计划"
          onPress={() => onAddPlan("")}
          style={[styles.headerActionButton, { backgroundColor: colors.surfaceContainerHigh }]}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.headerActionText, { color: colors.primary }]}>添加计划</Text>
        </Pressable>
      </View>

      {tasks.length === 0 && standalonePlans.length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="还没有任务或计划" description="添加一个明确、可完成的目标或日程。" />
      ) : (
        tasks.map((task) => {
          const taskPlans = plans.filter((plan) => plan.taskId === task.id);
          const isExpanded = expandedTasks.has(task.id);
          const donePlans = taskPlans.filter((plan) => plan.done).length;
          return (
            <Card key={task.id} variant="elevated" style={styles.taskCardWrapper}>
              <View style={styles.taskCardMain}>
                <MD3Checkbox checked={task.done} onPress={() => onToggle(task)} color={accent} />
                <Pressable
                  style={styles.itemCopy}
                  onPress={() => {
                    if (taskPlans.length > 0) onToggleExpand(task.id);
                  }}
                >
                  <Text
                    style={[
                      styles.itemName,
                      {
                        color: colors.onSurface,
                        opacity: task.done ? 0.5 : 1,
                        textDecorationLine: task.done ? "line-through" : "none",
                      },
                    ]}
                  >
                    {task.name}
                  </Text>
                  {task.description ? (
                    <Text style={[styles.itemDescription, { color: colors.onSurfaceVariant }]} numberOfLines={2}>
                      {task.description}
                    </Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <AssistChip
                      label={`${PRIORITY_LABEL[task.priority]}优先级`}
                      color={task.priority === "high" ? colors.error : undefined}
                    />
                    <Text style={[styles.itemMeta, { color: colors.onSurfaceVariant }]}>
                      {relativeRangeLabel(task.startDate, task.endDate)}
                    </Text>
                    {taskPlans.length > 0 ? (
                      <Text style={[styles.planBadgeText, { color: colors.primary }]}>
                        {donePlans}/{taskPlans.length} 计划
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
                <View style={styles.rowActions}>
                  <Pressable accessibilityLabel="为任务添加计划" onPress={() => onAddPlan(task.id)} style={styles.miniAction}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  </Pressable>
                  <Pressable accessibilityLabel="编辑任务" onPress={() => onEdit(task)} style={styles.miniAction}>
                    <Ionicons name="create-outline" size={18} color={colors.onSurfaceVariant} />
                  </Pressable>
                  <Pressable accessibilityLabel="删除任务" onPress={() => onDelete(task)} style={styles.miniAction}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                  {taskPlans.length > 0 ? (
                    <Pressable
                      accessibilityLabel={isExpanded ? "收起计划" : "展开计划"}
                      onPress={() => onToggleExpand(task.id)}
                      style={styles.miniAction}
                    >
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.onSurfaceVariant} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {isExpanded && taskPlans.length > 0 ? (
                <View style={[styles.taskPlansContainer, { borderTopColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLow }]}>
                  {taskPlans.map((plan) => (
                    <View key={plan.id} style={styles.subPlanRow}>
                      <MD3Checkbox checked={plan.done} onPress={() => onTogglePlan(plan)} color={accent} />
                      <View style={styles.subPlanCopy}>
                        <Text
                          style={[
                            styles.subPlanName,
                            {
                              color: colors.onSurface,
                              opacity: plan.done ? 0.5 : 1,
                              textDecorationLine: plan.done ? "line-through" : "none",
                            },
                          ]}
                        >
                          {plan.name}
                        </Text>
                        <Text style={[styles.subPlanMeta, { color: colors.onSurfaceVariant }]}>
                          {formatDateFull(plan.date)} · {plan.startTime}–{plan.endTime}
                          {plan.recurrence.frequency !== "none" ? ` · ${dailyPlanRepeatLabel(plan.recurrence.frequency)}` : ""}
                        </Text>
                      </View>
                      <View style={styles.rowActions}>
                        <Pressable accessibilityLabel="编辑计划" onPress={() => onEditPlan(plan)} style={styles.miniAction}>
                          <Ionicons name="create-outline" size={16} color={colors.onSurfaceVariant} />
                        </Pressable>
                        <Pressable accessibilityLabel="删除计划" onPress={() => onDeletePlan(plan)} style={styles.miniAction}>
                          <Ionicons name="trash-outline" size={16} color={colors.error} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </Card>
          );
        })
      )}

      {standalonePlans.length > 0 ? (
        <View style={styles.standaloneSection}>
          <View style={styles.subSectionHeader}>
            <View style={styles.rowAlign}>
              <Ionicons name="calendar" size={17} color={colors.primary} />
              <Text style={[styles.subSectionTitle, { color: colors.onSurface }]}>独立计划（未关联任务）</Text>
            </View>
            <Text style={[styles.subSectionSubtitle, { color: colors.onSurfaceVariant }]}>
              {standalonePlans.length} 个计划
            </Text>
          </View>
          {standalonePlans.map((plan) => (
            <Card key={plan.id} variant="elevated" style={styles.planCard}>
              <View style={[styles.planRail, { backgroundColor: accent }]} />
              <MD3Checkbox checked={plan.done} onPress={() => onTogglePlan(plan)} color={accent} />
              <View style={styles.itemCopy}>
                <Text
                  style={[
                    styles.itemName,
                    {
                      color: colors.onSurface,
                      opacity: plan.done ? 0.5 : 1,
                      textDecorationLine: plan.done ? "line-through" : "none",
                    },
                  ]}
                >
                  {plan.name}
                </Text>
                <Text style={[styles.itemMeta, { color: colors.onSurfaceVariant }]}>
                  {formatDateFull(plan.date)} · {plan.startTime}–{plan.endTime}
                  {plan.recurrence.frequency !== "none" ? ` · ${dailyPlanRepeatLabel(plan.recurrence.frequency)}` : ""}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable accessibilityLabel="编辑计划" onPress={() => onEditPlan(plan)} style={styles.miniAction}>
                  <Ionicons name="create-outline" size={18} color={colors.onSurfaceVariant} />
                </Pressable>
                <Pressable accessibilityLabel="删除计划" onPress={() => onDeletePlan(plan)} style={styles.miniAction}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function StatsSection({ metrics, project, accent }: { metrics: ReturnType<typeof calculateProjectMetrics>; project: Project; accent: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.section}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>项目统计</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.onSurfaceVariant }]}>持续推进，及时看见进展</Text>
      </View>
      <View style={styles.metricGrid}>
        <MetricCard icon="checkmark-done-outline" value={`${metrics.taskProgress}%`} label="任务完成率" tint={accent} />
        <MetricCard icon="calendar-outline" value={`${metrics.planProgress}%`} label="计划完成率" tint={colors.success} />
        <MetricCard icon="hourglass-outline" value={`${metrics.remainingDays}`} label="剩余天数" tint={colors.warning} />
        <MetricCard icon="timer-outline" value={`${metrics.focusMinutes}m`} label={`${metrics.focusSessions} 次专注`} tint={colors.primary} />
      </View>
      <Card variant="elevated" style={styles.statsCard}>
        <StatProgress label="任务进度" value={metrics.taskProgress} caption={`${metrics.taskDone} / ${metrics.taskTotal} 已完成`} color={accent} />
        <StatProgress label="计划进度" value={metrics.planProgress} caption={`${metrics.planDone} / ${metrics.planTotal} 已完成`} color={colors.success} />
        <View style={[styles.statLine, { borderTopColor: colors.outlineVariant }]}>
          <Text style={[styles.statLineLabel, { color: colors.onSurface }]}>项目周期</Text>
          <Text style={[styles.statLineValue, { color: colors.onSurfaceVariant }]}>{relativeRangeLabel(project.startDate, project.endDate)}</Text>
        </View>
        <View style={[styles.statLine, { borderTopColor: colors.outlineVariant }]}>
          <Text style={[styles.statLineLabel, { color: colors.onSurface }]}>预计结束</Text>
          <Text style={[styles.statLineValue, { color: colors.onSurfaceVariant }]}>{formatDateFull(project.endDate)}</Text>
        </View>
      </Card>
    </View>
  );
}

function MetricCard({ icon, value, label, tint }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string; tint: string }) {
  const colors = useAppColors();
  return (
    <Card variant="elevated" style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${tint}20` }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={[styles.metricValue, { color: colors.onSurface }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </Card>
  );
}

function StatProgress({ label, value, caption, color }: { label: string; value: number; caption: string; color: string }) {
  const colors = useAppColors();
  return (
    <View style={styles.statProgress}>
      <View style={styles.statProgressLabel}>
        <Text style={[styles.statLineLabel, { color: colors.onSurface }]}>{label}</Text>
        <Text style={[styles.statLineValue, { color: colors.onSurfaceVariant }]}>{caption}</Text>
      </View>
      <ProgressBar value={value} color={color} />
    </View>
  );
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") { if (globalThis.confirm(`${title}\n\n${message}`)) onConfirm(); return; }
  Alert.alert(title, message, [{ text: "取消", style: "cancel" }, { text: "确定", style: "destructive", onPress: onConfirm }]);
}
function validDateRange(start: string, end: string) { return /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start; }
function validTimeRange(start: string, end: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end) && end > start; }
function timeMinutes(value: string) { const [hour = 0, minute = 0] = value.split(":").map(Number); return hour * 60 + minute; }

const styles = StyleSheet.create({
  hero: { borderRadius: MD3Shape.large, padding: 18 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: MD3Shape.medium, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroTitle: { ...MD3Typography.titleMedium, fontWeight: "600" },
  heroDate: { ...MD3Typography.bodySmall, fontSize: 11, marginTop: 2 },
  archiveButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  heroDescription: { ...MD3Typography.bodyMedium, lineHeight: 20, marginTop: 12 },
  heroProgressLabel: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: 6 },
  heroProgressText: { ...MD3Typography.labelMedium },
  heroProgressValue: { ...MD3Typography.labelMedium, fontWeight: "600" },
  heroProgressMeta: { ...MD3Typography.bodySmall, marginTop: 6 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 4 },
  sectionTitle: { ...MD3Typography.titleMedium, fontWeight: "600" },
  sectionSubtitle: { ...MD3Typography.bodySmall, marginTop: 2 },
  headerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: MD3Shape.small,
  },
  headerActionText: { ...MD3Typography.labelMedium, fontWeight: "600" },
  taskCardWrapper: { borderRadius: MD3Shape.medium, overflow: "hidden" },
  taskCardMain: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  planBadgeText: { ...MD3Typography.labelSmall, fontWeight: "600" },
  taskPlansContainer: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4, paddingHorizontal: 12, gap: 4 },
  subPlanRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  subPlanCopy: { flex: 1, minWidth: 0 },
  subPlanName: { ...MD3Typography.bodyMedium, fontWeight: "500" },
  subPlanMeta: { ...MD3Typography.labelSmall, marginTop: 2 },
  standaloneSection: { gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(0,0,0,0.08)" },
  subSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 4, marginBottom: 4 },
  rowAlign: { flexDirection: "row", alignItems: "center", gap: 6 },
  subSectionTitle: { ...MD3Typography.titleSmall, fontWeight: "600" },
  subSectionSubtitle: { ...MD3Typography.bodySmall },
  itemCard: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: MD3Shape.medium },
  checkButton: { width: 38, height: 40, alignItems: "center", justifyContent: "center" },
  itemCopy: { flex: 1, minWidth: 0 },
  itemName: { ...MD3Typography.titleSmall, fontWeight: "600" },
  itemDescription: { ...MD3Typography.bodySmall, lineHeight: 17, marginTop: 2 },
  itemMeta: { ...MD3Typography.labelSmall, marginTop: 2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
  rowActions: { flexDirection: "row" },
  miniAction: { width: 36, height: 38, alignItems: "center", justifyContent: "center" },
  dateHeading: { ...MD3Typography.labelLarge, fontWeight: "600", marginTop: 6, marginLeft: 4 },
  planCard: { padding: 10, flexDirection: "row", alignItems: "center", gap: 6, overflow: "hidden", borderRadius: MD3Shape.medium },
  planRail: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "48%", flexGrow: 1, minHeight: 110, borderRadius: MD3Shape.medium, padding: 12 },
  metricIcon: { width: 36, height: 36, borderRadius: MD3Shape.small, alignItems: "center", justifyContent: "center" },
  metricValue: { ...MD3Typography.headlineSmall, fontWeight: "600", marginTop: 8 },
  metricLabel: { ...MD3Typography.labelSmall, marginTop: 2 },
  statsCard: { gap: 16, borderRadius: MD3Shape.large },
  statProgress: { gap: 6 },
  statProgressLabel: { flexDirection: "row", justifyContent: "space-between" },
  statLine: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, flexDirection: "row", justifyContent: "space-between" },
  statLineLabel: { ...MD3Typography.titleSmall, fontWeight: "600" },
  statLineValue: { ...MD3Typography.bodySmall },
  formRow: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
