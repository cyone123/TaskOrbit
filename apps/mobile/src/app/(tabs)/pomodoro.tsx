import Ionicons from "@expo/vector-icons/Ionicons";
import { createPausedTimer, type PomodoroLink, type Settings } from "@task-orbit/core";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, Card, Field, FormModal, IconButton, PageScroll, PrimaryButton } from "@/components/ui";
import { useAppColors } from "@/constants/theme";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

const PHASE_LABEL = { focus: "专注", shortBreak: "短休息", longBreak: "长休息" } as const;
type PomodoroSettings = Pick<Settings, "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes" | "longBreakInterval">;

export default function PomodoroScreen() {
  const colors = useAppColors();
  const { state, startPomodoro, pausePomodoro, skipPomodoro, resetPomodoro, updatePomodoroSettings } = useAppStore();
  const [now, setNow] = useState(Date.now());
  const [taskId, setTaskId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(timer); }, []);
  useEffect(() => { if (state.activeTimer?.taskId) setTaskId(state.activeTimer.taskId); }, [state.activeTimer?.taskId]);

  const timer = state.activeTimer ?? createPausedTimer(state.settings);
  const remaining = timer.status === "running" && timer.endAt !== null ? Math.max(0, timer.endAt - now) : timer.remainingMs;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const progress = 1 - remaining / timer.durationMs;
  const availableTasks = useMemo(() => state.tasks.filter((task) => !task.done && state.projects.some((project) => project.id === task.projectId && !project.archived)), [state.projects, state.tasks]);
  const linkedTask = state.tasks.find((task) => task.id === taskId);
  const linkedProject = state.projects.find((project) => project.id === linkedTask?.projectId);

  const link: PomodoroLink = linkedTask ? { projectId: linkedTask.projectId, taskId: linkedTask.id, dailyPlanId: null } : { projectId: null, taskId: null, dailyPlanId: null };
  const toggle = async () => {
    if (timer.status === "running") { pausePomodoro(); return; }
    const scheduled = await startPomodoro(link);
    if (!scheduled) Alert.alert("计时已开始", "当前环境未启用系统通知，请保持应用可见或在系统设置中允许通知。");
  };

  const confirmReset = () => {
    Alert.alert("重置计时器", "清除当前计时进度并回到一轮新的专注？", [
      { text: "取消", style: "cancel" },
      {
        text: "重置",
        style: "destructive",
        onPress: () => {
          resetPomodoro();
          setTaskId("");
          setNow(Date.now());
        },
      },
    ]);
  };

  return (
    <AppScreen
      title="番茄钟"
      subtitle={`已完成 ${timer.focusCount} 轮专注`}
      action={<IconButton icon="settings-outline" label="番茄钟设置" onPress={() => setSettingsOpen(true)} />}
    >
      <PageScroll>
        <Card style={styles.timerCard}>
          <View style={[styles.phaseBadge, { backgroundColor: timer.phase === "focus" ? "#B3261E1F" : "#386A201F" }]}>
            <Ionicons name={timer.phase === "focus" ? "flash" : "cafe"} size={16} color={timer.phase === "focus" ? colors.danger : colors.success} />
            <Text style={{ color: timer.phase === "focus" ? colors.danger : colors.success, fontWeight: "800", fontSize: 12 }}>{PHASE_LABEL[timer.phase]}</Text>
          </View>
          <View style={[styles.ring, { borderColor: colors.surfaceVariant }]}>
            <View style={[styles.progressArc, { borderColor: timer.phase === "focus" ? colors.danger : colors.success, opacity: Math.max(0.2, progress) }]} />
            <Text style={[styles.timerText, { color: colors.text }]}>{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</Text>
            <Text style={[styles.timerStatus, { color: colors.textMuted }]}>{timer.status === "running" ? "保持节奏" : timer.remainingMs < timer.durationMs ? "已暂停" : "准备开始"}</Text>
          </View>
          <View style={styles.controls}>
            <PrimaryButton label={timer.status === "running" ? "暂停" : "开始"} icon={timer.status === "running" ? "pause" : "play"} onPress={() => void toggle()} />
            <Pressable style={[styles.roundButton, { backgroundColor: colors.surfaceVariant }]} onPress={skipPomodoro} accessibilityLabel="跳过阶段"><Ionicons name="play-skip-forward" size={21} color={colors.textMuted} /></Pressable>
            <Pressable style={[styles.roundButton, { backgroundColor: colors.surfaceVariant }]} onPress={confirmReset} accessibilityLabel="重置"><Ionicons name="refresh" size={21} color={colors.textMuted} /></Pressable>
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>专注对象</Text>
        <Card>
          <Pressable disabled={timer.status === "running"} onPress={() => setTaskId("")} style={[styles.taskChoice, { borderBottomColor: colors.border }]}>
            <Ionicons name={!linkedTask ? "radio-button-on" : "radio-button-off"} size={20} color={colors.primary} />
            <View><Text style={[styles.choiceName, { color: colors.text }]}>自由专注</Text><Text style={[styles.choiceMeta, { color: colors.textMuted }]}>不关联具体任务</Text></View>
          </Pressable>
          {availableTasks.map((task) => {
            const project = state.projects.find((item) => item.id === task.projectId);
            const selected = linkedTask?.id === task.id;
            return (
              <Pressable key={task.id} disabled={timer.status === "running"} onPress={() => setTaskId(task.id)} style={[styles.taskChoice, { borderBottomColor: colors.border, opacity: timer.status === "running" && !selected ? 0.45 : 1 }]}>
                <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={PROJECT_COLOR_HEX[project?.color ?? ""] ?? colors.primary} />
                <View style={styles.choiceCopy}><Text style={[styles.choiceName, { color: colors.text }]}>{task.name}</Text><Text style={[styles.choiceMeta, { color: colors.textMuted }]}>{project?.name ?? "项目"}</Text></View>
              </Pressable>
            );
          })}
          {availableTasks.length === 0 ? <Text style={[styles.none, { color: colors.textMuted }]}>创建任务后，可在这里关联专注记录。</Text> : null}
        </Card>
        <Card style={styles.notificationCard}><Ionicons name="notifications-outline" size={22} color={colors.primary} /><View style={styles.choiceCopy}><Text style={[styles.choiceName, { color: colors.text }]}>后台完成提醒</Text><Text style={[styles.choiceMeta, { color: colors.textMuted }]}>首次开始时请求系统通知权限；暂停或重置会自动撤销提醒。</Text></View></Card>
      </PageScroll>
      <PomodoroSettingsModal
        visible={settingsOpen}
        settings={state.settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => {
          updatePomodoroSettings(patch);
          setTaskId("");
          setNow(Date.now());
          setSettingsOpen(false);
        }}
      />
    </AppScreen>
  );
}

function PomodoroSettingsModal({ visible, settings, onClose, onSave }: {
  visible: boolean;
  settings: Settings;
  onClose(): void;
  onSave(patch: PomodoroSettings): void;
}) {
  const colors = useAppColors();
  const [focusMinutes, setFocusMinutes] = useState(String(settings.focusMinutes));
  const [shortBreakMinutes, setShortBreakMinutes] = useState(String(settings.shortBreakMinutes));
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(settings.longBreakMinutes));
  const [longBreakInterval, setLongBreakInterval] = useState(String(settings.longBreakInterval));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setFocusMinutes(String(settings.focusMinutes));
    setShortBreakMinutes(String(settings.shortBreakMinutes));
    setLongBreakMinutes(String(settings.longBreakMinutes));
    setLongBreakInterval(String(settings.longBreakInterval));
    setError("");
  }, [settings, visible]);

  const submit = () => {
    const values = [focusMinutes, shortBreakMinutes, longBreakMinutes, longBreakInterval].map(Number);
    if (values.some((value) => !Number.isSafeInteger(value) || value < 1)) {
      setError("请输入大于 0 的整数。");
      return;
    }
    const [focus, shortBreak, longBreak, interval] = values;
    onSave({
      focusMinutes: focus,
      shortBreakMinutes: shortBreak,
      longBreakMinutes: longBreak,
      longBreakInterval: interval,
    });
  };

  return (
    <FormModal visible={visible} title="番茄钟设置" onClose={onClose} onSubmit={submit} submitLabel="保存设置">
      <Text style={[styles.settingsHint, { color: colors.textMuted }]}>保存后会清除当前计时进度，并按新时长开始下一轮。</Text>
      <Field label="专注时长（分钟）" value={focusMinutes} onChangeText={setFocusMinutes} keyboardType="number-pad" />
      <Field label="短休息时长（分钟）" value={shortBreakMinutes} onChangeText={setShortBreakMinutes} keyboardType="number-pad" />
      <Field label="长休息时长（分钟）" value={longBreakMinutes} onChangeText={setLongBreakMinutes} keyboardType="number-pad" />
      <Field label="长休息间隔（完成几轮专注后）" value={longBreakInterval} onChangeText={setLongBreakInterval} keyboardType="number-pad" />
      {error ? <Text style={[styles.settingsError, { color: colors.danger }]}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  timerCard: { alignItems: "center", paddingVertical: 24 }, phaseBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 },
  ring: { width: 230, height: 230, borderRadius: 115, borderWidth: 10, marginVertical: 25, alignItems: "center", justifyContent: "center" }, progressArc: { position: "absolute", width: 230, height: 230, borderRadius: 115, borderWidth: 10, transform: [{ rotate: "45deg" }] }, timerText: { fontSize: 55, fontWeight: "300", fontVariant: ["tabular-nums"], letterSpacing: -2 }, timerStatus: { fontSize: 12, marginTop: 4 },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 }, roundButton: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }, sectionTitle: { fontSize: 17, fontWeight: "800", marginTop: 5, marginLeft: 4 },
  taskChoice: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth }, choiceCopy: { flex: 1 }, choiceName: { fontSize: 14, fontWeight: "700" }, choiceMeta: { fontSize: 11, lineHeight: 16, marginTop: 3 }, none: { fontSize: 12, textAlign: "center", paddingVertical: 18 }, notificationCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingsHint: { fontSize: 13, lineHeight: 19 }, settingsError: { fontSize: 13, fontWeight: "600" },
});
