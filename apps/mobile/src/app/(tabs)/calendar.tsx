import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addDays,
  dailyPlanRepeatLabel,
  formatDateShort,
  isToday,
  isWeekend,
  parseISODate,
  timeToMinutes,
  todayISO,
  toISODate,
  weekDays,
  weekdayCN,
  type DailyPlan,
  type DailyPlanRepeat,
  type Project,
  type Task,
} from "@task-orbit/core";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AppScreen,
  Card,
  ChoiceRow,
  EmptyState,
  Field,
  FormModal,
  IconButton,
  SegmentedControl,
} from "@/components/ui";
import { useAppColors, type AppColors } from "@/constants/theme";
import {
  calendarHeading,
  layoutPlanColumns,
  monthGridDays,
  taskRangeInWeek,
  visibleHourRange,
  type CalendarMode,
  type WeekCalendarMode,
} from "@/features/calendar-model";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

const HOUR_HEIGHT = 52;
const WEEK_DAY_WIDTH = 96;
const GANTT_DAY_WIDTH = 70;
const GANTT_LABEL_WIDTH = 136;
const TIME_AXIS_WIDTH = 52;

interface PlanFormState {
  visible: boolean;
  editing: DailyPlan | null;
}

export default function CalendarScreen() {
  const colors = useAppColors();
  const router = useRouter();
  const { state, addPlans, togglePlan, updatePlan, removePlan } = useAppStore();
  const [anchor, setAnchor] = useState(() => parseISODate(todayISO()));
  const [mode, setMode] = useState<CalendarMode>("week");
  const [weekMode, setWeekMode] = useState<WeekCalendarMode>("gantt");
  const [planForm, setPlanForm] = useState<PlanFormState>({ visible: false, editing: null });
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planDate, setPlanDate] = useState(todayISO());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [repeat, setRepeat] = useState<DailyPlanRepeat>("none");
  const [repeatCount, setRepeatCount] = useState("4");

  const selectedISO = toISODate(anchor);
  const days = useMemo(() => weekDays(anchor), [anchor]);
  const monthDays = useMemo(() => monthGridDays(anchor), [anchor]);
  const projects = useMemo(() => state.projects.filter((project) => !project.archived), [state.projects]);
  const projectById = useMemo(() => new Map(state.projects.map((project) => [project.id, project])), [state.projects]);
  const formTasks = useMemo(() => state.tasks.filter((task) => task.projectId === projectId), [projectId, state.tasks]);
  const plansOfDay = useMemo(
    () => state.dailyPlans.filter((plan) => plan.date === selectedISO).sort(sortPlans),
    [selectedISO, state.dailyPlans],
  );
  const tasksOfDay = useMemo(
    () => state.tasks.filter((task) => task.startDate <= selectedISO && task.endDate >= selectedISO),
    [selectedISO, state.tasks],
  );
  const plansOfWeek = useMemo(
    () => days.map((day) => state.dailyPlans.filter((plan) => plan.date === toISODate(day)).sort(sortPlans)),
    [days, state.dailyPlans],
  );
  const tasksInWeek = useMemo(() => {
    const start = toISODate(days[0]);
    const end = toISODate(days[6]);
    return state.tasks
      .filter((task) => task.endDate >= start && task.startDate <= end)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name));
  }, [days, state.tasks]);
  const monthTaskStarts = useMemo(() => {
    const result = new Map<string, Task[]>();
    const gridStart = toISODate(monthDays[0]);
    const gridEnd = toISODate(monthDays[monthDays.length - 1]);
    state.tasks.filter((task) => task.endDate >= gridStart && task.startDate <= gridEnd).forEach((task) => {
      const visibleStart = task.startDate < gridStart ? gridStart : task.startDate;
      result.set(visibleStart, [...(result.get(visibleStart) ?? []), task]);
    });
    return result;
  }, [monthDays, state.tasks]);

  const colorForProject = (id: string | null) => id ? PROJECT_COLOR_HEX[projectById.get(id)?.color ?? ""] ?? colors.primary : colors.outline;

  const navigate = (direction: number) => {
    setAnchor((current) => {
      if (mode === "month") return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      return addDays(current, direction * (mode === "week" ? 7 : 1));
    });
  };

  const resetForm = () => {
    setPlanForm({ visible: false, editing: null });
    setName("");
    setDescription("");
    setPlanDate(selectedISO);
    setStartTime("09:00");
    setEndTime("10:00");
    setProjectId("");
    setTaskId("");
    setRepeat("none");
    setRepeatCount("4");
  };

  const openNewPlan = (date = selectedISO) => {
    resetForm();
    setPlanDate(date);
    setPlanForm({ visible: true, editing: null });
  };

  const openPlanEditor = (plan: DailyPlan) => {
    setName(plan.name);
    setDescription(plan.description);
    setPlanDate(plan.date);
    setStartTime(plan.startTime);
    setEndTime(plan.endTime);
    setProjectId(plan.projectId ?? "");
    setTaskId(plan.taskId ?? "");
    setRepeat("none");
    setRepeatCount("4");
    setPlanForm({ visible: true, editing: plan });
  };

  const submitPlan = () => {
    if (!name.trim()) return;
    if (!isISODate(planDate)) {
      Alert.alert("日期无效", "请使用 YYYY-MM-DD 格式。");
      return;
    }
    if (!isTime(startTime) || !isTime(endTime) || endTime <= startTime) {
      Alert.alert("时间无效", "请使用 HH:mm，且结束时间必须晚于开始时间。");
      return;
    }
    const count = Number.parseInt(repeatCount, 10);
    if (!planForm.editing && repeat !== "none" && (!Number.isFinite(count) || count < 2 || count > 365)) {
      Alert.alert("重复次数无效", "重复次数需要在 2 到 365 之间。");
      return;
    }
    const input = {
      projectId: projectId || null,
      taskId: taskId || null,
      name: name.trim(),
      description: description.trim(),
      date: planDate,
      startTime,
      endTime,
      estimatedMinutes: Math.max(1, timeToMinutes(endTime) - timeToMinutes(startTime)),
    };
    if (planForm.editing) updatePlan(planForm.editing.id, input);
    else addPlans({ ...input, repeat, repeatCount: repeat === "none" ? 1 : count });
    setAnchor(parseISODate(planDate));
    resetForm();
  };

  const askDeletePlan = (plan: DailyPlan) => {
    const remove = () => removePlan(plan.id);
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(`确定删除「${plan.name}」？`)) remove();
      return;
    }
    Alert.alert("删除日程", `确定删除「${plan.name}」？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: remove },
    ]);
  };

  const openDay = (day: Date) => {
    setAnchor(day);
    setMode("day");
  };

  return (
    <AppScreen
      title="日历"
      subtitle="从任务跨度到每日时间块"
      action={<IconButton icon="add" label="添加计划" onPress={() => openNewPlan()} />}
    >
      <View style={styles.toolbar}>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as CalendarMode)}
          options={[
            { value: "day", label: "日", icon: "today-outline" },
            { value: "week", label: "周", icon: "calendar-outline" },
            { value: "month", label: "月", icon: "grid-outline" },
          ]}
        />
        <View style={styles.dateNavigation}>
          <IconButton icon="chevron-back" label="上一页" onPress={() => navigate(-1)} />
          <Pressable accessibilityRole="button" onPress={() => setAnchor(parseISODate(todayISO()))} style={styles.headingButton}>
            <Text style={[styles.heading, { color: colors.text }]} numberOfLines={1}>{calendarHeading(mode, anchor)}</Text>
            <Text style={[styles.todayHint, { color: colors.primary }]}>回到今天</Text>
          </Pressable>
          <IconButton icon="chevron-forward" label="下一页" onPress={() => navigate(1)} />
        </View>
        {mode === "week" ? (
          <SegmentedControl
            value={weekMode}
            onChange={(value) => setWeekMode(value as WeekCalendarMode)}
            options={[
              { value: "gantt", label: "任务甘特", icon: "git-compare-outline" },
              { value: "plans", label: "每日计划", icon: "time-outline" },
            ]}
          />
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {mode === "day" ? (
          <DayView
            date={selectedISO}
            plans={plansOfDay}
            tasks={tasksOfDay}
            projectById={projectById}
            colors={colors}
            colorForProject={colorForProject}
            onEditPlan={openPlanEditor}
            onTogglePlan={togglePlan}
            onDeletePlan={askDeletePlan}
            onOpenProject={(id) => router.push({ pathname: "/project/[id]", params: { id } })}
            onAddPlan={() => openNewPlan(selectedISO)}
          />
        ) : null}
        {mode === "week" && weekMode === "gantt" ? (
          <WeekGantt
            days={days}
            tasks={tasksInWeek}
            plans={plansOfWeek}
            projectById={projectById}
            colors={colors}
            colorForProject={colorForProject}
            onOpenDay={openDay}
            onOpenProject={(id) => router.push({ pathname: "/project/[id]", params: { id } })}
          />
        ) : null}
        {mode === "week" && weekMode === "plans" ? (
          <WeekPlans
            days={days}
            plans={plansOfWeek}
            tasks={state.tasks}
            colors={colors}
            colorForProject={colorForProject}
            onOpenDay={openDay}
            onEditPlan={openPlanEditor}
          />
        ) : null}
        {mode === "month" ? (
          <MonthView
            anchor={anchor}
            days={monthDays}
            plans={state.dailyPlans}
            taskStarts={monthTaskStarts}
            colors={colors}
            colorForProject={colorForProject}
            onOpenDay={openDay}
          />
        ) : null}
      </ScrollView>

      <FormModal
        visible={planForm.visible}
        title={planForm.editing ? "编辑每日计划" : "添加每日计划"}
        onClose={resetForm}
        onSubmit={submitPlan}
        canSubmit={Boolean(name.trim())}
      >
        <Field label="日程名称" value={name} onChangeText={setName} placeholder="例如：完成交互稿" />
        <Field label="说明（可选）" value={description} onChangeText={setDescription} placeholder="需要完成什么？" multiline />
        <Field label="日期" value={planDate} onChangeText={setPlanDate} placeholder="YYYY-MM-DD" />
        <View style={styles.formRow}>
          <View style={styles.flex}><Field label="开始" value={startTime} onChangeText={setStartTime} placeholder="09:00" /></View>
          <View style={styles.flex}><Field label="结束" value={endTime} onChangeText={setEndTime} placeholder="10:00" /></View>
        </View>
        <ChoiceRow
          label="项目（可选）"
          value={projectId}
          onChange={(value) => { setProjectId(value); setTaskId(""); }}
          options={[{ value: "", label: "独立日程" }, ...projects.map((project) => ({ value: project.id, label: project.name, color: PROJECT_COLOR_HEX[project.color] }))]}
        />
        {projectId && formTasks.length > 0 ? (
          <ChoiceRow label="任务（可选）" value={taskId} onChange={setTaskId} options={[{ value: "", label: "不关联任务" }, ...formTasks.map((task) => ({ value: task.id, label: task.name }))]} />
        ) : null}
        {!planForm.editing ? (
          <ChoiceRow label="重复" value={repeat} onChange={(value) => setRepeat(value as DailyPlanRepeat)} options={[{ value: "none", label: "不重复" }, { value: "daily", label: "每天" }, { value: "weekly", label: "每周" }, { value: "monthly", label: "每月" }]} />
        ) : null}
        {!planForm.editing && repeat !== "none" ? <Field label="次数（2-365）" value={repeatCount} onChangeText={setRepeatCount} keyboardType="number-pad" /> : null}
      </FormModal>
    </AppScreen>
  );
}

function DayView({ date, plans, tasks, projectById, colors, colorForProject, onEditPlan, onTogglePlan, onDeletePlan, onOpenProject, onAddPlan }: {
  date: string;
  plans: DailyPlan[];
  tasks: Task[];
  projectById: Map<string, Project>;
  colors: AppColors;
  colorForProject(id: string | null): string;
  onEditPlan(plan: DailyPlan): void;
  onTogglePlan(id: string, done: boolean): void;
  onDeletePlan(plan: DailyPlan): void;
  onOpenProject(id: string): void;
  onAddPlan(): void;
}) {
  const range = visibleHourRange(plans);
  const layouts = layoutPlanColumns(plans);
  const hours = Array.from({ length: range.endHour - range.startHour }, (_, index) => range.startHour + index);
  const timelineHeight = hours.length * HOUR_HEIGHT;
  const now = new Date();
  const nowOffset = isToday(date) ? ((now.getHours() * 60 + now.getMinutes() - range.startHour * 60) / 60) * HOUR_HEIGHT : -1;

  return (
    <View style={styles.sectionGap}>
      <View style={styles.summaryRow}>
        <SummaryChip icon="time-outline" label={`${plans.length} 个计划`} colors={colors} />
        <SummaryChip icon="checkmark-done-outline" label={`${tasks.length} 个进行中任务`} colors={colors} />
      </View>
      {tasks.length > 0 ? (
        <View style={styles.blockGap}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>进行中的任务</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.taskChips}>
            {tasks.map((task) => (
              <Pressable key={task.id} onPress={() => onOpenProject(task.projectId)} style={[styles.taskChip, { backgroundColor: colors.secondarySoft }]}>
                <View style={[styles.dot, { backgroundColor: colorForProject(task.projectId) }]} />
                <Text style={[styles.taskChipText, { color: colors.onSecondarySoft }]} numberOfLines={1}>{task.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.blockGap}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>时间轴</Text>
        <Card style={[styles.timelineCard, { height: timelineHeight + 20 }]}>
          <View style={[styles.timeAxis, { height: timelineHeight }]}>
            {hours.map((hour) => <Text key={hour} style={[styles.hourLabel, { color: colors.textMuted, top: (hour - range.startHour) * HOUR_HEIGHT - 7 }]}>{padHour(hour)}</Text>)}
          </View>
          <View style={[styles.timelineTrack, { height: timelineHeight, borderLeftColor: colors.border }]}>
            {hours.map((hour) => <View key={hour} style={[styles.hourLine, { borderTopColor: colors.border, top: (hour - range.startHour) * HOUR_HEIGHT }]} />)}
            {plans.map((plan) => {
              const start = Math.max(timeToMinutes(plan.startTime), range.startHour * 60);
              const end = Math.min(timeToMinutes(plan.endTime), range.endHour * 60);
              const layout = layouts.get(plan.id) ?? { column: 0, columnCount: 1 };
              const top = ((start - range.startHour * 60) / 60) * HOUR_HEIGHT;
              const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 28);
              const color = colorForProject(plan.projectId);
              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={`编辑计划 ${plan.name}`}
                  onPress={() => onEditPlan(plan)}
                  style={[styles.dayPlanBlock, {
                    top,
                    height,
                    left: `${(layout.column / layout.columnCount) * 100}%`,
                    width: `${100 / layout.columnCount}%`,
                    backgroundColor: color,
                    opacity: plan.done ? 0.55 : 1,
                  }]}
                >
                  <Text style={styles.blockTitle} numberOfLines={1}>{plan.name}</Text>
                  {height >= 43 ? <Text style={styles.blockMeta} numberOfLines={1}>{plan.startTime}–{plan.endTime}</Text> : null}
                </Pressable>
              );
            })}
            {nowOffset >= 0 && nowOffset <= timelineHeight ? <View style={[styles.nowLine, { backgroundColor: colors.danger, top: nowOffset }]}><View style={[styles.nowDot, { backgroundColor: colors.danger }]} /></View> : null}
          </View>
        </Card>
      </View>
      <View style={styles.blockGap}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>当日计划清单</Text>
          <Pressable onPress={onAddPlan} style={styles.inlineAction}><Ionicons name="add" size={18} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: "700" }}>添加</Text></Pressable>
        </View>
        {plans.length === 0 ? <EmptyState icon="calendar-clear-outline" title="这一天还没有安排" description="留白也很好，或者添加一个明确的时间块。" /> : plans.map((plan) => {
          const project = plan.projectId ? projectById.get(plan.projectId) : null;
          const accent = colorForProject(plan.projectId);
          return (
            <Card key={plan.id} style={styles.planCard}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: plan.done }} onPress={() => onTogglePlan(plan.id, !plan.done)} style={styles.roundAction}>
                <Ionicons name={plan.done ? "checkmark-circle" : "ellipse-outline"} size={25} color={plan.done ? colors.success : accent} />
              </Pressable>
              <Pressable onPress={() => onEditPlan(plan)} style={styles.planCopy}>
                <Text style={[styles.planName, { color: colors.text, opacity: plan.done ? 0.5 : 1, textDecorationLine: plan.done ? "line-through" : "none" }]} numberOfLines={2}>{plan.name}</Text>
                <Text style={[styles.planMeta, { color: colors.textMuted }]}>{plan.startTime}–{plan.endTime} · {project?.name ?? "独立日程"}</Text>
                {plan.recurrence.frequency !== "none" ? <Text style={[styles.recurrence, { color: colors.primary }]}>{dailyPlanRepeatLabel(plan.recurrence.frequency)} · 第 {plan.recurrence.occurrence}/{plan.recurrence.count} 次</Text> : null}
              </Pressable>
              <Pressable accessibilityLabel={`删除 ${plan.name}`} onPress={() => onDeletePlan(plan)} style={styles.roundAction}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable>
            </Card>
          );
        })}
      </View>
    </View>
  );
}

function WeekGantt({ days, tasks, plans, projectById, colors, colorForProject, onOpenDay, onOpenProject }: {
  days: Date[];
  tasks: Task[];
  plans: DailyPlan[][];
  projectById: Map<string, Project>;
  colors: AppColors;
  colorForProject(id: string | null): string;
  onOpenDay(day: Date): void;
  onOpenProject(id: string): void;
}) {
  const chartWidth = GANTT_LABEL_WIDTH + GANTT_DAY_WIDTH * 7;
  return (
    <View style={styles.sectionGap}>
      <ChartIntroduction icon="git-compare-outline" title="任务甘特图" description="横向滑动查看完整一周，点击日期进入日视图。" colors={colors} />
      <Card style={styles.chartCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: chartWidth }}>
          <View style={{ width: chartWidth }}>
            <View style={[styles.ganttHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.ganttLabel, { backgroundColor: colors.surfaceContainerHigh }]}><Text style={[styles.ganttLabelTitle, { color: colors.textMuted }]}>任务 / 项目</Text></View>
              {days.map((day, index) => (
                <Pressable key={toISODate(day)} onPress={() => onOpenDay(day)} style={[styles.ganttDayHeader, { width: GANTT_DAY_WIDTH, backgroundColor: isToday(toISODate(day)) ? colors.primarySoft : isWeekend(day) ? colors.surfaceContainerHigh : colors.surfaceContainer }]}>
                  <Text style={[styles.weekday, { color: colors.textMuted }]}>{weekdayCN(day)}</Text>
                  <Text style={[styles.dayNumber, { color: isToday(toISODate(day)) ? colors.onPrimarySoft : colors.text }]}>{day.getDate()}</Text>
                  <Text style={[styles.planCount, { color: colors.textMuted }]}>{plans[index].length ? `${plans[index].length} 项` : "—"}</Text>
                </Pressable>
              ))}
            </View>
            {tasks.length === 0 ? <EmptyState icon="calendar-clear-outline" title="本周没有任务" description="项目中的跨日任务会在这里形成时间条。" /> : tasks.map((task) => {
              const range = taskRangeInWeek(task, days[0]);
              const accent = colorForProject(task.projectId);
              const project = projectById.get(task.projectId);
              return (
                <View key={task.id} style={[styles.ganttRow, { borderBottomColor: colors.border }]}>
                  <Pressable onPress={() => onOpenProject(task.projectId)} style={[styles.ganttLabel, { backgroundColor: colors.surfaceContainer }]}>
                    <View style={styles.labelNameRow}><View style={[styles.dot, { backgroundColor: accent }]} /><Text style={[styles.ganttTaskName, { color: colors.text, textDecorationLine: task.done ? "line-through" : "none" }]} numberOfLines={1}>{task.name}</Text></View>
                    <Text style={[styles.ganttProject, { color: colors.textMuted }]} numberOfLines={1}>{project?.name ?? "未知项目"}</Text>
                  </Pressable>
                  <View style={[styles.ganttTrack, { width: GANTT_DAY_WIDTH * 7 }]}>
                    {days.map((day) => <View key={toISODate(day)} style={[styles.ganttGridCell, { width: GANTT_DAY_WIDTH, borderLeftColor: colors.border, backgroundColor: isToday(toISODate(day)) ? `${colors.primary}0D` : "transparent" }]} />)}
                    {range ? (
                      <Pressable onPress={() => onOpenProject(task.projectId)} style={[styles.ganttBar, { left: range.startIndex * GANTT_DAY_WIDTH + 4, width: (range.endIndex - range.startIndex + 1) * GANTT_DAY_WIDTH - 8, backgroundColor: accent, opacity: task.done ? 0.55 : 1 }]}>
                        <Text style={styles.ganttBarText} numberOfLines={1}>{task.name}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>
    </View>
  );
}

function WeekPlans({ days, plans, tasks, colors, colorForProject, onOpenDay, onEditPlan }: {
  days: Date[];
  plans: DailyPlan[][];
  tasks: Task[];
  colors: AppColors;
  colorForProject(id: string | null): string;
  onOpenDay(day: Date): void;
  onEditPlan(plan: DailyPlan): void;
}) {
  const flatPlans = plans.flat();
  const range = visibleHourRange(flatPlans);
  const hours = Array.from({ length: range.endHour - range.startHour }, (_, index) => range.startHour + index);
  const timelineHeight = hours.length * HOUR_HEIGHT;
  const chartWidth = TIME_AXIS_WIDTH + WEEK_DAY_WIDTH * 7;
  const layouts = plans.map((items) => layoutPlanColumns(items));
  return (
    <View style={styles.sectionGap}>
      <ChartIntroduction icon="time-outline" title="每日计划图" description="按时间查看七天计划；横向滑动，点击计划即可编辑。" colors={colors} />
      <Card style={styles.chartCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width: chartWidth }}>
          <View style={{ width: chartWidth }}>
            <View style={[styles.weekPlanHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.weekTimeLabel, { backgroundColor: colors.surfaceContainerHigh }]}><Text style={[styles.weekday, { color: colors.textMuted }]}>时间</Text></View>
              {days.map((day) => (
                <Pressable key={toISODate(day)} onPress={() => onOpenDay(day)} style={[styles.weekPlanDayHeader, { backgroundColor: isToday(toISODate(day)) ? colors.primarySoft : colors.surfaceContainer }]}>
                  <Text style={[styles.weekday, { color: colors.textMuted }]}>{weekdayCN(day)}</Text>
                  <Text style={[styles.dayNumber, { color: isToday(toISODate(day)) ? colors.onPrimarySoft : colors.text }]}>{day.getDate()}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.allDayRow, { borderBottomColor: colors.border }]}>
              <View style={[styles.weekTimeLabel, { backgroundColor: colors.surfaceContainerHigh }]}><Text style={[styles.allDayLabel, { color: colors.textMuted }]}>任务</Text></View>
              {days.map((day) => {
                const iso = toISODate(day);
                const active = tasks.filter((task) => task.startDate <= iso && task.endDate >= iso);
                return <View key={iso} style={[styles.allDayCell, { borderLeftColor: colors.border }]}>{active.slice(0, 2).map((task) => <View key={task.id} style={[styles.miniTask, { backgroundColor: colorForProject(task.projectId) }]}><Text style={styles.miniTaskText} numberOfLines={1}>{task.name}</Text></View>)}{active.length > 2 ? <Text style={[styles.moreText, { color: colors.textMuted }]}>+{active.length - 2}</Text> : null}</View>;
              })}
            </View>
            <View style={{ flexDirection: "row", height: timelineHeight }}>
              <View style={[styles.weekAxis, { backgroundColor: colors.surfaceContainerHigh }]}>
                {hours.map((hour) => <Text key={hour} style={[styles.weekHour, { color: colors.textMuted, top: (hour - range.startHour) * HOUR_HEIGHT - 7 }]}>{padHour(hour)}</Text>)}
              </View>
              {days.map((day, dayIndex) => (
                <View key={toISODate(day)} style={[styles.weekDayColumn, { borderLeftColor: colors.border, backgroundColor: isToday(toISODate(day)) ? `${colors.primary}0D` : "transparent" }]}>
                  {hours.map((hour) => <View key={hour} style={[styles.hourLine, { borderTopColor: colors.border, top: (hour - range.startHour) * HOUR_HEIGHT }]} />)}
                  {plans[dayIndex].map((plan) => {
                    const start = Math.max(timeToMinutes(plan.startTime), range.startHour * 60);
                    const end = Math.min(timeToMinutes(plan.endTime), range.endHour * 60);
                    if (end <= start) return null;
                    const layout = layouts[dayIndex].get(plan.id) ?? { column: 0, columnCount: 1 };
                    const top = ((start - range.startHour * 60) / 60) * HOUR_HEIGHT;
                    const height = Math.max(((end - start) / 60) * HOUR_HEIGHT - 3, 28);
                    return (
                      <Pressable key={plan.id} onPress={() => onEditPlan(plan)} style={[styles.weekPlanBlock, { top, height, left: `${(layout.column / layout.columnCount) * 100}%`, width: `${100 / layout.columnCount}%`, backgroundColor: colorForProject(plan.projectId), opacity: plan.done ? 0.55 : 1 }]}>
                        <Text style={styles.weekPlanTitle} numberOfLines={2}>{plan.name}</Text>
                        {height > 48 ? <Text style={styles.weekPlanTime}>{plan.startTime}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Card>
    </View>
  );
}

function MonthView({ anchor, days, plans, taskStarts, colors, colorForProject, onOpenDay }: {
  anchor: Date;
  days: Date[];
  plans: DailyPlan[];
  taskStarts: Map<string, Task[]>;
  colors: AppColors;
  colorForProject(id: string | null): string;
  onOpenDay(day: Date): void;
}) {
  return (
    <View style={styles.sectionGap}>
      <ChartIntroduction icon="grid-outline" title="月度总览" description="色点代表计划或任务起点；点击日期查看当天详情。" colors={colors} />
      <Card style={styles.monthCard}>
        <View style={styles.monthWeekdays}>{weekDays(anchor).map((day) => <Text key={weekdayCN(day)} style={[styles.monthWeekday, { color: colors.textMuted }]}>{weekdayCN(day).replace("周", "")}</Text>)}</View>
        <View style={styles.monthGrid}>{days.map((day) => {
          const iso = toISODate(day);
          const dayPlans = plans.filter((plan) => plan.date === iso).sort(sortPlans);
          const dayTasks = taskStarts.get(iso) ?? [];
          const dots = [...dayTasks.map((task) => colorForProject(task.projectId)), ...dayPlans.map((plan) => colorForProject(plan.projectId))];
          const inMonth = day.getMonth() === anchor.getMonth();
          const today = isToday(iso);
          return (
            <Pressable
              key={iso}
              accessibilityLabel={`${iso}，${dots.length} 项安排`}
              onPress={() => onOpenDay(day)}
              style={[styles.monthCell, { borderColor: colors.border, backgroundColor: today ? colors.primarySoft : isWeekend(day) ? colors.surfaceContainerHigh : "transparent", opacity: inMonth ? 1 : 0.42 }]}
            >
              <View style={[styles.dateBadge, today && { backgroundColor: colors.primary }]}><Text style={[styles.monthDate, { color: today ? colors.onPrimary : colors.text }]}>{day.getDate()}</Text></View>
              <View style={styles.monthDots}>{dots.slice(0, 3).map((dot, index) => <View key={`${iso}-${index}`} style={[styles.monthDot, { backgroundColor: dot }]} />)}</View>
              {dots.length > 3 ? <Text style={[styles.monthMore, { color: colors.textMuted }]}>+{dots.length - 3}</Text> : null}
            </Pressable>
          );
        })}</View>
      </Card>
    </View>
  );
}

function SummaryChip({ icon, label, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; colors: AppColors }) {
  return <View style={[styles.summaryChip, { backgroundColor: colors.secondarySoft }]}><Ionicons name={icon} size={17} color={colors.onSecondarySoft} /><Text style={[styles.summaryChipText, { color: colors.onSecondarySoft }]}>{label}</Text></View>;
}

function ChartIntroduction({ icon, title, description, colors }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; colors: AppColors }) {
  return <View style={styles.chartIntro}><View style={[styles.chartIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name={icon} size={22} color={colors.primary} /></View><View style={styles.flex}><Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.chartDescription, { color: colors.textMuted }]}>{description}</Text></View></View>;
}

function sortPlans(a: DailyPlan, b: DailyPlan): number {
  return a.startTime.localeCompare(b.startTime) || a.name.localeCompare(b.name);
}

function padHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingBottom: 12, gap: 10, width: "100%", maxWidth: 860, alignSelf: "center" },
  dateNavigation: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  headingButton: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  heading: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  todayHint: { fontSize: 11, fontWeight: "700", marginTop: 3 },
  page: { paddingHorizontal: 16, paddingBottom: 32, width: "100%", alignSelf: "center" },
  sectionGap: { gap: 16 },
  blockGap: { gap: 9 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryChip: { minHeight: 38, borderRadius: 19, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 7 },
  summaryChipText: { fontSize: 12, fontWeight: "700" },
  sectionLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  inlineAction: { minHeight: 40, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  taskChips: { gap: 8, paddingRight: 16 },
  taskChip: { maxWidth: 230, minHeight: 42, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 8 },
  taskChipText: { flexShrink: 1, fontSize: 13, fontWeight: "700" },
  dot: { width: 9, height: 9, borderRadius: 5 },
  timelineCard: { padding: 10, flexDirection: "row", overflow: "hidden" },
  timeAxis: { width: TIME_AXIS_WIDTH, position: "relative" },
  hourLabel: { position: "absolute", right: 8, fontSize: 10, fontWeight: "600" },
  timelineTrack: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, position: "relative" },
  hourLine: { position: "absolute", left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  dayPlanBlock: { position: "absolute", borderRadius: 8, borderWidth: 2, borderColor: "rgba(255,255,255,0.76)", paddingHorizontal: 7, paddingVertical: 4, overflow: "hidden" },
  blockTitle: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  blockMeta: { color: "rgba(255,255,255,0.88)", fontSize: 9, marginTop: 2 },
  nowLine: { position: "absolute", left: -4, right: 0, height: 2, zIndex: 8 },
  nowDot: { position: "absolute", left: -4, top: -3, width: 8, height: 8, borderRadius: 4 },
  planCard: { minHeight: 84, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  roundAction: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  planCopy: { flex: 1, paddingVertical: 5 },
  planName: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  planMeta: { fontSize: 11, marginTop: 4 },
  recurrence: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  chartIntro: { flexDirection: "row", alignItems: "center", gap: 12 },
  chartIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  chartTitle: { fontSize: 17, fontWeight: "800" },
  chartDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  chartCard: { padding: 0, overflow: "hidden", borderRadius: 20 },
  ganttHeader: { height: 78, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  ganttLabel: { width: GANTT_LABEL_WIDTH, paddingHorizontal: 12, justifyContent: "center" },
  ganttLabelTitle: { fontSize: 11, fontWeight: "800" },
  ganttDayHeader: { alignItems: "center", justifyContent: "center" },
  weekday: { fontSize: 10, fontWeight: "700" },
  dayNumber: { fontSize: 18, lineHeight: 22, fontWeight: "800" },
  planCount: { fontSize: 9, marginTop: 2 },
  ganttRow: { height: 66, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  labelNameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  ganttTaskName: { flex: 1, fontSize: 12, fontWeight: "700" },
  ganttProject: { marginLeft: 16, marginTop: 4, fontSize: 10 },
  ganttTrack: { height: 66, flexDirection: "row", position: "relative" },
  ganttGridCell: { height: 66, borderLeftWidth: StyleSheet.hairlineWidth },
  ganttBar: { position: "absolute", height: 34, top: 16, borderRadius: 10, paddingHorizontal: 10, justifyContent: "center", zIndex: 2 },
  ganttBarText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  weekPlanHeader: { height: 68, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  weekTimeLabel: { width: TIME_AXIS_WIDTH, alignItems: "center", justifyContent: "center" },
  weekPlanDayHeader: { width: WEEK_DAY_WIDTH, alignItems: "center", justifyContent: "center" },
  allDayRow: { minHeight: 74, flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  allDayLabel: { fontSize: 10, fontWeight: "800" },
  allDayCell: { width: WEEK_DAY_WIDTH, minHeight: 74, borderLeftWidth: StyleSheet.hairlineWidth, padding: 4, gap: 3 },
  miniTask: { minHeight: 24, borderRadius: 6, paddingHorizontal: 5, justifyContent: "center" },
  miniTaskText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
  moreText: { fontSize: 9, fontWeight: "700", textAlign: "center" },
  weekAxis: { width: TIME_AXIS_WIDTH, height: "100%", position: "relative" },
  weekHour: { position: "absolute", right: 7, fontSize: 9, fontWeight: "600" },
  weekDayColumn: { width: WEEK_DAY_WIDTH, height: "100%", borderLeftWidth: StyleSheet.hairlineWidth, position: "relative" },
  weekPlanBlock: { position: "absolute", borderRadius: 7, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.74)", padding: 4, overflow: "hidden", zIndex: 2 },
  weekPlanTitle: { color: "#FFFFFF", fontSize: 9, fontWeight: "800", lineHeight: 11 },
  weekPlanTime: { color: "rgba(255,255,255,0.88)", fontSize: 8, marginTop: 2 },
  monthCard: { padding: 8, overflow: "hidden" },
  monthWeekdays: { flexDirection: "row", paddingBottom: 5 },
  monthWeekday: { width: "14.2857%", textAlign: "center", fontSize: 11, fontWeight: "800" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: "14.2857%", minHeight: 65, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", paddingTop: 5 },
  dateBadge: { minWidth: 27, height: 27, paddingHorizontal: 5, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  monthDate: { fontSize: 12, fontWeight: "800" },
  monthDots: { minHeight: 10, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 2, marginTop: 5 },
  monthDot: { width: 5, height: 5, borderRadius: 3 },
  monthMore: { fontSize: 8, fontWeight: "700", marginTop: 2 },
  formRow: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
