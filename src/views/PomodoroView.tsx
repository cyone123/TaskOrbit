import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatDurationMinutes,
  selectTodayFocusSessions,
  todayISO,
  type ActiveTimer,
  type PomodoroKind,
  type PomodoroLink,
} from "@task-orbit/core";
import { Icon } from "../components/Icon";
import {
  FilledCard,
  FilledButton,
  IconButton,
  OutlinedSegmentedButton,
  OutlinedSegmentedButtonSet,
  OutlinedSelect,
  OutlinedTextField,
  SelectOption,
  TextButton,
  eventValue,
} from "../components/material";
import { Dialog, useSnackbar } from "../components/ui";
import { useStore } from "../store/store";

const PHASES: { key: PomodoroKind; label: string }[] = [
  { key: "focus", label: "专注" },
  { key: "shortBreak", label: "短休息" },
  { key: "longBreak", label: "长休息" },
];

const EMPTY_LINK: PomodoroLink = {
  projectId: null,
  taskId: null,
  dailyPlanId: null,
};

function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playBeep(times = 3) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.35;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {
    /* audio unavailable */
  }
}

function linkValueOf(timer: ActiveTimer | null): string {
  if (!timer) return "";
  if (timer.dailyPlanId) return `pl_${timer.dailyPlanId}`;
  if (timer.taskId) return `t_${timer.taskId}`;
  if (timer.projectId) return `p_${timer.projectId}`;
  return "";
}

function linkOfTimer(timer: ActiveTimer | null): PomodoroLink {
  if (!timer) return EMPTY_LINK;
  return {
    projectId: timer.projectId,
    taskId: timer.taskId,
    dailyPlanId: timer.dailyPlanId,
  };
}

export function PomodoroView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();
  const s = state.settings;
  const timer = state.activeTimer;
  const running = timer?.status === "running";
  const phase = timer?.phase ?? "focus";
  const [now, setNow] = useState(() => Date.now());
  const [linkValue, setLinkValue] = useState(() => linkValueOf(timer));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const linkRef = useRef<PomodoroLink>(linkOfTimer(timer));
  const previousTimerRef = useRef<ActiveTimer | null>(timer);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running, timer?.endAt]);

  useEffect(() => {
    if (!timer) {
      linkRef.current = EMPTY_LINK;
      setLinkValue("");
      return;
    }
    const link = linkOfTimer(timer);
    linkRef.current = link;
    setLinkValue(linkValueOf(timer));
  }, [timer?.projectId, timer?.taskId, timer?.dailyPlanId]);

  useEffect(() => {
    const previous = previousTimerRef.current;
    if (
      previous &&
      timer &&
      previous.phase !== timer.phase &&
      previous.status === "running" &&
      timer.status === "running"
    ) {
      if (previous.phase === "focus") {
        playBeep(3);
        show(timer.phase === "longBreak" ? "专注完成！进入长休息" : "专注完成！进入短休息");
      } else {
        playBeep(2);
        show("休息结束，开始新的专注");
      }
    }
    previousTimerRef.current = timer;
  }, [show, timer?.phase, timer?.status]);

  const linkOptions = useMemo(() => {
    const opts: {
      value: string;
      label: string;
      projectId: string | null;
      taskId: string | null;
      dailyPlanId: string | null;
    }[] = [
      { value: "", label: "无（自由专注）", ...EMPTY_LINK },
    ];
    const visibleProjects = state.projects.filter(
      (project) => !project.archived || project.id === timer?.projectId,
    );
    const visibleProjectIds = new Set(visibleProjects.map((project) => project.id));

    for (const project of visibleProjects) {
      opts.push({
        value: `p_${project.id}`,
        label: `项目 · ${project.name}`,
        projectId: project.id,
        taskId: null,
        dailyPlanId: null,
      });
    }
    for (const task of state.tasks.filter((item) => visibleProjectIds.has(item.projectId))) {
      const project = state.projects.find((item) => item.id === task.projectId);
      opts.push({
        value: `t_${task.id}`,
        label: `任务 · ${project?.name ?? ""} · ${task.name}`,
        projectId: task.projectId,
        taskId: task.id,
        dailyPlanId: null,
      });
    }
    for (const plan of state.dailyPlans.filter(
      (item) => !item.projectId || visibleProjectIds.has(item.projectId),
    )) {
      opts.push({
        value: `pl_${plan.id}`,
        label: `计划 · ${plan.name}`,
        projectId: plan.projectId,
        taskId: plan.taskId,
        dailyPlanId: plan.id,
      });
    }
    return opts;
  }, [state.projects, state.tasks, state.dailyPlans, timer?.projectId]);

  const onChangeLink = (value: string) => {
    const option = linkOptions.find((item) => item.value === value);
    const link = option
      ? {
          projectId: option.projectId,
          taskId: option.taskId,
          dailyPlanId: option.dailyPlanId,
        }
      : EMPTY_LINK;
    setLinkValue(value);
    linkRef.current = link;
    store.updateTimerLink(link);
  };

  const remaining = timer
    ? timer.status === "running" && timer.endAt !== null
      ? Math.max(0, timer.endAt - now)
      : timer.remainingMs
    : s.focusMinutes * 60_000;
  const total = timer?.durationMs ?? s.focusMinutes * 60_000;
  const progress = total > 0 ? remaining / total : 0;
  const R = 128;
  const C = 2 * Math.PI * R;

  const toggle = () => {
    if (running) {
      store.pauseTimer();
      return;
    }

    // The store starts from the wall clock, so refresh the display clock in
    // the same user action instead of waiting for the first 250ms tick.
    setNow(Date.now());
    if (timer) {
      store.resumeTimer();
    } else {
      store.startTimer(linkRef.current);
    }
  };

  const today = todayISO();
  const todaySessions = selectTodayFocusSessions(state, today);
  const todayMinutes = todaySessions.reduce((totalMinutes, session) => totalMinutes + session.minutes, 0);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 48 }}>
      <div className="spread mb-16">
        <div className="title-lg">番茄钟</div>
        <div className="row gap-8">
          <div className="chip">
            <Icon name="check_circle" size={16} style={{ color: "#43A047" }} />
            今日 {todaySessions.length} 个 · {formatDurationMinutes(todayMinutes)}
          </div>
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="设置" title="设置">
            <Icon name="settings" />
          </IconButton>
        </div>
      </div>

      <FilledCard className="material-card pomodoro-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px" }}>
        <OutlinedSegmentedButtonSet className="segmented-control mb-16">
          {PHASES.map((item) => (
            <OutlinedSegmentedButton
              key={item.key}
              label={item.label}
              selected={phase === item.key}
              onClick={() => store.selectTimerPhase(item.key)}
            />
          ))}
        </OutlinedSegmentedButtonSet>

        <div style={{ position: "relative", width: 288, height: 288 }}>
          <svg width={288} height={288} className="pomo-ring">
            <circle cx={144} cy={144} r={R} fill="none" stroke="var(--md-surface-container-highest)" strokeWidth={14} />
            <circle
              cx={144}
              cy={144}
              r={R}
              fill="none"
              stroke={phase === "focus" ? "var(--md-primary)" : "#43A047"}
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <div className="display" style={{ fontSize: 48, lineHeight: "56px", fontWeight: 500 }}>{clock(remaining)}</div>
            <div className="body-md muted">{running ? "专注中…" : "已暂停"}</div>
          </div>
        </div>

        <div className="row gap-16" style={{ marginTop: 20 }}>
          <IconButton onClick={() => store.resetTimer()} aria-label="重置" title="重置">
            <Icon name="replay" />
          </IconButton>
          <FilledButton className="timer-start-button" onClick={toggle}>
            <Icon name={running ? "pause" : "play_arrow"} slot="icon" />
            {running ? "暂停" : timer && remaining < total ? "继续" : "开始"}
          </FilledButton>
          <IconButton onClick={() => store.skipTimer()} aria-label="跳过" title="跳过">
            <Icon name="skip_next" />
          </IconButton>
        </div>

        <div className="field" style={{ width: "100%", maxWidth: 420, marginTop: 24, marginBottom: 0 }}>
          <OutlinedSelect
            label="本次专注对象"
            value={linkValue}
            onChange={(event) => onChangeLink(eventValue(event))}
            menuPositioning="fixed"
          >
            {linkOptions.map((option) => (
              <SelectOption
                key={option.value}
                value={option.value}
                selected={linkValue === option.value}
              >
                <span slot="headline">{option.label}</span>
              </SelectOption>
            ))}
          </OutlinedSelect>
        </div>
      </FilledCard>

      <FilledCard className="material-card mt-16" style={{ padding: "14px 18px" }}>
        <div className="body-sm muted">
          专注 {s.focusMinutes} 分钟 · 短休息 {s.shortBreakMinutes} 分钟 · 长休息 {s.longBreakMinutes} 分钟 · 每 {s.longBreakInterval} 个番茄进入长休息。完成专注后会自动记录到统计中。
        </div>
      </FilledCard>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => {
          store.updateSettings(patch);
          setSettingsOpen(false);
          show("设置已保存");
        }}
      />
    </div>
  );
}

function SettingsDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (patch: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number; longBreakInterval: number }) => void;
}) {
  const { state } = useStore();
  const s = state.settings;
  const [focus, setFocus] = useState(String(s.focusMinutes));
  const [short, setShort] = useState(String(s.shortBreakMinutes));
  const [long, setLong] = useState(String(s.longBreakMinutes));
  const [interval, setIntervalVal] = useState(String(s.longBreakInterval));
  const [error, setError] = useState("");

  const submit = () => {
    const f = Number(focus);
    const sh = Number(short);
    const lo = Number(long);
    const it = Number(interval);
    if (!f || !sh || !lo || !it || f < 1 || sh < 1 || lo < 1 || it < 1) {
      setError("请输入大于 0 的有效数值");
      return;
    }
    onSave({
      focusMinutes: Math.round(f),
      shortBreakMinutes: Math.round(sh),
      longBreakMinutes: Math.round(lo),
      longBreakInterval: Math.round(it),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="番茄钟设置"
      actions={
        <>
          <TextButton onClick={onClose}>取消</TextButton>
          <FilledButton onClick={submit}>保存</FilledButton>
        </>
      }
    >
      <div className="field__row">
        <div className="field">
          <OutlinedTextField
            label="专注时长（分钟）"
            type="number"
            min="1"
            value={focus}
            onInput={(event) => setFocus(eventValue(event))}
          />
        </div>
        <div className="field">
          <OutlinedTextField
            label="短休息（分钟）"
            type="number"
            min="1"
            value={short}
            onInput={(event) => setShort(eventValue(event))}
          />
        </div>
      </div>
      <div className="field__row">
        <div className="field">
          <OutlinedTextField
            label="长休息（分钟）"
            type="number"
            min="1"
            value={long}
            onInput={(event) => setLong(eventValue(event))}
          />
        </div>
        <div className="field">
          <OutlinedTextField
            label="长休息间隔（个）"
            type="number"
            min="1"
            value={interval}
            onInput={(event) => setIntervalVal(eventValue(event))}
          />
        </div>
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
    </Dialog>
  );
}
