import Ionicons from "@expo/vector-icons/Ionicons";
import { addDays, formatDateFull, parseISODate, toISODate, todayISO, type DailyPlanRepeat } from "@task-orbit/core";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, Card, ChoiceRow, EmptyState, Field, FormModal, IconButton, PageScroll } from "@/components/ui";
import { useAppColors } from "@/constants/theme";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

export default function CalendarScreen() {
  const colors = useAppColors();
  const { state, addPlans, togglePlan, removePlan } = useAppStore();
  const [date, setDate] = useState(todayISO());
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [repeat, setRepeat] = useState<DailyPlanRepeat>("none");
  const [repeatCount, setRepeatCount] = useState("4");
  const projects = state.projects.filter((project) => !project.archived);
  const tasks = state.tasks.filter((task) => task.projectId === projectId);
  const plans = useMemo(() => state.dailyPlans.filter((plan) => plan.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)), [date, state.dailyPlans]);

  const moveDate = (offset: number) => setDate(toISODate(addDays(parseISODate(date), offset)));
  const reset = () => { setModal(false); setName(""); setDescription(""); setStartTime("09:00"); setEndTime("10:00"); setProjectId(""); setTaskId(""); setRepeat("none"); setRepeatCount("4"); };
  const submit = () => {
    if (!name.trim()) return;
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) {
      Alert.alert("时间无效", "请使用 HH:mm，且结束时间必须晚于开始时间。"); return;
    }
    const parsedRepeatCount = Number.parseInt(repeatCount, 10);
    if (repeat !== "none" && (!Number.isFinite(parsedRepeatCount) || parsedRepeatCount < 2 || parsedRepeatCount > 365)) {
      Alert.alert("重复次数无效", "重复次数需要在 2 到 365 之间。"); return;
    }
    addPlans({
      projectId: projectId || null,
      taskId: taskId || null,
      name: name.trim(), description: description.trim(), date, startTime, endTime,
      estimatedMinutes: Math.max(1, timeMinutes(endTime) - timeMinutes(startTime)),
      repeat,
      repeatCount: repeat === "none" ? 1 : parsedRepeatCount,
    });
    reset();
  };

  return (
    <AppScreen title="日历" subtitle="安排今天，也看见接下来" action={<IconButton icon="add" label="添加日程" onPress={() => setModal(true)} />}>
      <View style={styles.dateNav}>
        <IconButton icon="chevron-back" label="前一天" onPress={() => moveDate(-1)} />
        <Pressable onPress={() => setDate(todayISO())} style={styles.dateCopy}>
          <Text style={[styles.dateTitle, { color: colors.text }]}>{date === todayISO() ? "今天" : formatDateFull(date)}</Text>
          <Text style={[styles.dateIso, { color: colors.textMuted }]}>{date}</Text>
        </Pressable>
        <IconButton icon="chevron-forward" label="后一天" onPress={() => moveDate(1)} />
      </View>
      <PageScroll>
        {plans.length === 0 ? <EmptyState icon="calendar-outline" title="这一天还没有安排" description="留白也很好，或者添加一个明确的时间块。" /> : plans.map((plan) => {
          const project = state.projects.find((item) => item.id === plan.projectId);
          const accent = project ? PROJECT_COLOR_HEX[project.color] ?? colors.primary : colors.primary;
          return (
            <Card key={plan.id} style={styles.planCard}>
              <View style={[styles.timeRail, { backgroundColor: accent }]} />
              <View style={styles.timeCopy}><Text style={[styles.startTime, { color: colors.text }]}>{plan.startTime}</Text><Text style={[styles.endTime, { color: colors.textMuted }]}>{plan.endTime}</Text></View>
              <Pressable onPress={() => togglePlan(plan.id, !plan.done)} style={styles.planCopy}>
                <Text style={[styles.planName, { color: colors.text, opacity: plan.done ? 0.5 : 1, textDecorationLine: plan.done ? "line-through" : "none" }]}>{plan.name}</Text>
                <Text style={[styles.planMeta, { color: colors.textMuted }]}>{project?.name ?? "独立日程"}{plan.recurrence.frequency !== "none" ? ` · 重复 ${plan.recurrence.occurrence}/${plan.recurrence.count}` : ""}</Text>
              </Pressable>
              <Pressable onPress={() => Alert.alert("删除日程", `确定删除「${plan.name}」？`, [{ text: "取消", style: "cancel" }, { text: "删除", style: "destructive", onPress: () => removePlan(plan.id) }])} accessibilityLabel="删除日程"><Ionicons name={plan.done ? "checkmark-circle" : "trash-outline"} size={21} color={plan.done ? colors.success : colors.tabInactive} /></Pressable>
            </Card>
          );
        })}
      </PageScroll>
      <FormModal visible={modal} title={`添加日程 · ${date}`} onClose={reset} onSubmit={submit} canSubmit={Boolean(name.trim())}>
        <Field label="日程名称" value={name} onChangeText={setName} placeholder="例如：完成交互稿" />
        <Field label="说明（可选）" value={description} onChangeText={setDescription} placeholder="需要完成什么？" multiline />
        <View style={styles.formRow}><View style={styles.flex}><Field label="开始" value={startTime} onChangeText={setStartTime} placeholder="09:00" /></View><View style={styles.flex}><Field label="结束" value={endTime} onChangeText={setEndTime} placeholder="10:00" /></View></View>
        <ChoiceRow label="项目（可选）" value={projectId} onChange={(value) => { setProjectId(value); setTaskId(""); }} options={[{ value: "", label: "独立日程" }, ...projects.map((project) => ({ value: project.id, label: project.name, color: PROJECT_COLOR_HEX[project.color] }))]} />
        {projectId && tasks.length ? <ChoiceRow label="任务（可选）" value={taskId} onChange={setTaskId} options={[{ value: "", label: "不关联任务" }, ...tasks.map((task) => ({ value: task.id, label: task.name }))]} /> : null}
        <ChoiceRow label="重复" value={repeat} onChange={(value) => setRepeat(value as DailyPlanRepeat)} options={[{ value: "none", label: "不重复" }, { value: "daily", label: "每天" }, { value: "weekly", label: "每周" }, { value: "monthly", label: "每月" }]} />
        {repeat !== "none" ? <Field label="次数（2-365）" value={repeatCount} onChangeText={setRepeatCount} keyboardType="number-pad" /> : null}
      </FormModal>
    </AppScreen>
  );
}

function timeMinutes(value: string): number {
  const [hour = 0, minute = 0] = value.split(":").map(Number);
  return hour * 60 + minute;
}

const styles = StyleSheet.create({
  dateNav: { paddingHorizontal: 16, paddingBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }, dateCopy: { minWidth: 170, alignItems: "center" }, dateTitle: { fontSize: 17, fontWeight: "800" }, dateIso: { fontSize: 11, marginTop: 2 },
  planCard: { minHeight: 82, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" }, timeRail: { width: 4, alignSelf: "stretch", borderRadius: 3 }, timeCopy: { width: 45 }, startTime: { fontSize: 14, fontWeight: "800" }, endTime: { fontSize: 11, marginTop: 3 }, planCopy: { flex: 1 }, planName: { fontSize: 15, fontWeight: "700" }, planMeta: { fontSize: 11, marginTop: 5 }, formRow: { flexDirection: "row", gap: 10 }, flex: { flex: 1 },
});
