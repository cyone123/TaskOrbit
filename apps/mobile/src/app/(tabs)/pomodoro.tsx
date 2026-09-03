import Ionicons from "@expo/vector-icons/Ionicons";
import { createPausedTimer, type PomodoroLink, type Settings } from "@task-orbit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppScreen,
  Card,
  Field,
  FilledButton,
  FormModal,
  IconButton,
  MD3Radio,
  PageScroll,
  TonalButton,
} from "@/components/ui";
import { MD3Shape, MD3Typography, useAppColors } from "@/constants/theme";
import { PROJECT_COLOR_HEX, useAppStore } from "@/store/app-store";

const PHASE_LABEL = { focus: "专注", shortBreak: "短休息", longBreak: "长休息" } as const;
type PomodoroSettings = Pick<Settings, "focusMinutes" | "shortBreakMinutes" | "longBreakMinutes" | "longBreakInterval">;

export default function PomodoroScreen() {
  const colors = useAppColors();
  const { state, startPomodoro, pausePomodoro, skipPomodoro, resetPomodoro, updatePomodoroSettings } = useAppStore();
  const [now, setNow] = useState(Date.now());
  const [taskId, setTaskId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state.activeTimer?.taskId) setTaskId(state.activeTimer.taskId);
  }, [state.activeTimer?.taskId]);

  useEffect(() => {
    if (!resetFeedback) return;
    const timeout = setTimeout(() => setResetFeedback(false), 1_600);
    return () => clearTimeout(timeout);
  }, [resetFeedback]);

  const timer = state.activeTimer ?? createPausedTimer(state.settings);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (timer.status === "running") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [timer.status, pulseAnim]);

  const remaining = timer.status === "running" && timer.endAt !== null ? Math.max(0, timer.endAt - now) : timer.remainingMs;
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  const progress = 1 - remaining / timer.durationMs;
  const availableTasks = useMemo(
    () =>
      state.tasks.filter(
        (task) =>
          !task.done &&
          state.projects.some((project) => project.id === task.projectId && !project.archived),
      ),
    [state.projects, state.tasks],
  );
  const linkedTask = state.tasks.find((task) => task.id === taskId);

  const link: PomodoroLink = linkedTask
    ? { projectId: linkedTask.projectId, taskId: linkedTask.id, dailyPlanId: null }
    : { projectId: null, taskId: null, dailyPlanId: null };

  const toggle = async () => {
    setResetFeedback(false);
    if (timer.status === "running") {
      pausePomodoro();
      return;
    }
    const scheduled = await startPomodoro(link);
    if (!scheduled) {
      Alert.alert("计时已开始", "当前环境未启用系统通知，请保持应用可见或在系统设置中允许通知。");
    }
  };

  const handleReset = () => {
    resetPomodoro();
    setTaskId("");
    setNow(Date.now());
    setResetFeedback(true);
  };

  return (
    <AppScreen
      title="番茄钟"
      subtitle={`已完成 ${timer.focusCount} 轮专注`}
      action={<IconButton icon="settings-outline" label="番茄钟设置" onPress={() => setSettingsOpen(true)} variant="tonal" />}
    >
      <PageScroll>
        <Card variant="elevated" style={styles.timerCard}>
          <View
            style={[
              styles.phaseBadge,
              {
                backgroundColor:
                  timer.phase === "focus"
                    ? colors.errorContainer
                    : colors.secondaryContainer,
              },
            ]}
          >
            <Ionicons
              name={timer.phase === "focus" ? "flash" : "cafe"}
              size={16}
              color={
                timer.phase === "focus"
                  ? colors.onErrorContainer
                  : colors.onSecondaryContainer
              }
            />
            <Text
              style={{
                color:
                  timer.phase === "focus"
                    ? colors.onErrorContainer
                    : colors.onSecondaryContainer,
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {PHASE_LABEL[timer.phase]}
            </Text>
          </View>
          <Animated.View style={[styles.ring, { borderColor: colors.surfaceContainerHighest, transform: [{ scale: pulseAnim }] }]}>
            <View
              style={[
                styles.progressArc,
                {
                  borderColor: timer.phase === "focus" ? colors.error : colors.success,
                  opacity: Math.max(0.2, progress),
                },
              ]}
            />
            <Text style={[styles.timerText, { color: colors.onSurface }]}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </Text>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.timerStatus, { color: resetFeedback ? colors.primary : colors.onSurfaceVariant }]}
            >
              {resetFeedback
                ? "已重置 · 准备开始"
                : timer.status === "running"
                ? "保持节奏"
                : timer.remainingMs < timer.durationMs
                ? "已暂停"
                : "准备开始"}
            </Text>
          </Animated.View>
          <View style={styles.controls}>
            <FilledButton
              label={timer.status === "running" ? "暂停" : "开始"}
              icon={timer.status === "running" ? "pause" : "play"}
              onPress={() => void toggle()}
            />
            <TonalButton
              label="跳过"
              icon="play-skip-forward"
              onPress={skipPomodoro}
            />
            <IconButton
              icon="refresh"
              label="重置"
              onPress={handleReset}
              variant="tonal"
            />
          </View>
        </Card>

        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>专注对象</Text>
        <Card variant="elevated">
          <Pressable
            disabled={timer.status === "running"}
            onPress={() => setTaskId("")}
            style={[styles.taskChoice, { borderBottomColor: colors.outlineVariant }]}
          >
            <MD3Radio selected={!linkedTask} onPress={() => setTaskId("")} disabled={timer.status === "running"} />
            <View style={styles.choiceCopy}>
              <Text style={[styles.choiceName, { color: colors.onSurface }]}>自由专注</Text>
              <Text style={[styles.choiceMeta, { color: colors.onSurfaceVariant }]}>不关联具体任务</Text>
            </View>
          </Pressable>
          {availableTasks.map((task) => {
            const project = state.projects.find((item) => item.id === task.projectId);
            const selected = linkedTask?.id === task.id;
            const projectAccent = PROJECT_COLOR_HEX[project?.color ?? ""] ?? colors.primary;
            return (
              <Pressable
                key={task.id}
                disabled={timer.status === "running"}
                onPress={() => setTaskId(task.id)}
                style={[
                  styles.taskChoice,
                  {
                    borderBottomColor: colors.outlineVariant,
                    opacity: timer.status === "running" && !selected ? 0.45 : 1,
                  },
                ]}
              >
                <MD3Radio
                  selected={selected}
                  onPress={() => setTaskId(task.id)}
                  disabled={timer.status === "running"}
                  color={projectAccent}
                />
                <View style={styles.choiceCopy}>
                  <Text style={[styles.choiceName, { color: colors.onSurface }]}>{task.name}</Text>
                  <Text style={[styles.choiceMeta, { color: colors.onSurfaceVariant }]}>
                    {project?.name ?? "项目"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
          {availableTasks.length === 0 ? (
            <Text style={[styles.none, { color: colors.onSurfaceVariant }]}>
              创建任务后，可在这里关联专注记录。
            </Text>
          ) : null}
        </Card>

        <Card variant="outlined" style={styles.notificationCard}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <View style={styles.choiceCopy}>
            <Text style={[styles.choiceName, { color: colors.onSurface }]}>后台完成提醒</Text>
            <Text style={[styles.choiceMeta, { color: colors.onSurfaceVariant }]}>
              首次开始时请求系统通知权限；暂停或重置会自动撤销提醒。
            </Text>
          </View>
        </Card>
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

function PomodoroSettingsModal({
  visible,
  settings,
  onClose,
  onSave,
}: {
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
      <Text style={[styles.settingsHint, { color: colors.onSurfaceVariant }]}>
        保存后会清除当前计时进度，并按新时长开始下一轮。
      </Text>
      <Field label="专注时长（分钟）" value={focusMinutes} onChangeText={setFocusMinutes} keyboardType="number-pad" />
      <Field label="短休息时长（分钟）" value={shortBreakMinutes} onChangeText={setShortBreakMinutes} keyboardType="number-pad" />
      <Field label="长休息时长（分钟）" value={longBreakMinutes} onChangeText={setLongBreakMinutes} keyboardType="number-pad" />
      <Field label="长休息间隔（完成几轮专注后）" value={longBreakInterval} onChangeText={setLongBreakInterval} keyboardType="number-pad" />
      {error ? <Text style={[styles.settingsError, { color: colors.error }]}>{error}</Text> : null}
    </FormModal>
  );
}

const styles = StyleSheet.create({
  timerCard: { alignItems: "center", paddingVertical: 24, borderRadius: MD3Shape.large },
  phaseBadge: {
    borderRadius: MD3Shape.small,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ring: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    marginVertical: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  progressArc: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 8,
    transform: [{ rotate: "45deg" }],
  },
  timerText: {
    ...MD3Typography.displaySmall,
    fontSize: 50,
    lineHeight: 58,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    letterSpacing: -1.5,
  },
  timerStatus: {
    ...MD3Typography.bodySmall,
    marginTop: 4,
  },
  controls: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: {
    ...MD3Typography.titleMedium,
    fontWeight: "600",
    marginTop: 8,
    marginLeft: 4,
  },
  taskChoice: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  choiceCopy: { flex: 1 },
  choiceName: { ...MD3Typography.titleSmall, fontWeight: "600" },
  choiceMeta: { ...MD3Typography.bodySmall, lineHeight: 16, marginTop: 2 },
  none: { ...MD3Typography.bodyMedium, textAlign: "center", paddingVertical: 18 },
  notificationCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: MD3Shape.medium },
  settingsHint: { ...MD3Typography.bodySmall, lineHeight: 18 },
  settingsError: { ...MD3Typography.labelMedium, fontWeight: "600" },
});
