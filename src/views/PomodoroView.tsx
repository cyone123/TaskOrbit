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
import { Badge, Dialog, SectionHeader, useSnackbar } from "../components/ui";
import {
  openPomodoroMiniWindow,
  supportsPomodoroMiniWindow,
} from "../desktop/pomodoro-window";
import { colorByKey } from "../store/colors";
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

function formatSessionTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
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
  const miniWindowAvailable = supportsPomodoroMiniWindow();

  const openMiniWindow = () => {
    void openPomodoroMiniWindow().catch((error) => {
      console.error("failed to open pomodoro mini window", error);
      show("无法打开番茄钟小窗");
    });
  };

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
    <div className="page-shell page-shell--narrow">
      <div className="spread mb-16">
        <div className="headline-md">番茄钟</div>
        <div className="row gap-8">
          <div className="chip chip--small pomo-summary-chip">
            <Icon name="check_circle" size={16} style={{ color: "var(--color-success)" }} />
            今日 {todaySessions.length} 个 · {formatDurationMinutes(todayMinutes)}
          </div>
          {miniWindowAvailable && (
            <IconButton onClick={openMiniWindow} aria-label="打开小窗" title="打开小窗">
              <Icon name="picture_in_picture_alt" size={20} />
            </IconButton>
          )}
          <IconButton onClick={() => setSettingsOpen(true)} aria-label="设置" title="设置">
            <Icon name="settings" size={20} />
          </IconButton>
        </div>
      </div>

      <FilledCard
        className={`material-card pomodoro-card pomo-phase-${phase}${running ? " is-running" : ""}`}
      >
        <div className="pomo-secondary">
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
        </div>

        <div className="pomo-stage">
          <svg width={288} height={288} className="pomo-ring">
            <circle cx={144} cy={144} r={R} fill="none" stroke="var(--md-surface-container-highest)" strokeWidth={14} />
            <circle
              cx={144}
              cy={144}
              r={R}
              fill="none"
              className="pomo-ring__progress"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - progress)}
            />
          </svg>
          <div className="pomo-readout">
            <div className="display-lg pomo-clock tabular-nums">{clock(remaining)}</div>
            <div className="label-lg muted pomo-phase-label">
              {running
                ? phase === "focus"
                  ? "专注中…"
                  : phase === "shortBreak"
                    ? "短休息中…"
                    : "长休息中…"
                : timer
                  ? "已暂停"
                  : "准备开始"}
            </div>
          </div>
        </div>

        <div className="row gap-16 pomo-controls">
          <IconButton onClick={() => store.resetTimer()} aria-label="重置" title="重置">
            <Icon name="replay" size={22} />
          </IconButton>
          <FilledButton className="timer-start-button" onClick={toggle}>
            <Icon name={running ? "pause" : "play_arrow"} slot="icon" size={22} />
            {running ? "暂停" : timer && remaining < total ? "继续" : "开始"}
          </FilledButton>
          <IconButton onClick={() => store.skipTimer()} aria-label="跳过" title="跳过">
            <Icon name="skip_next" size={22} />
          </IconButton>
        </div>

        <div className="field pomo-secondary pomo-link-field">
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

      <div className="body-sm muted pomodoro-note">
        专注 {s.focusMinutes} 分钟 · 短休息 {s.shortBreakMinutes} 分钟 · 长休息 {s.longBreakMinutes} 分钟 · 每 {s.longBreakInterval} 个番茄进入长休息。完成专注后会自动记录到统计中。
      </div>

      {todaySessions.length > 0 && (
        <div className="pomo-today-sessions">
          <SectionHeader
            title="今日专注记录"
            badge={<Badge value={todaySessions.length} variant="success" />}
            subtitle={`共计 ${formatDurationMinutes(todayMinutes)}`}
          />
          <div className="pomo-session-list">
            {todaySessions.map((session) => {
              const project = session.projectId
                ? state.projects.find((p) => p.id === session.projectId)
                : null;
              const targetName =
                session.dailyPlanNameSnapshot ??
                session.taskNameSnapshot ??
                session.projectNameSnapshot ??
                "自由专注";
              const dotColor = project ? colorByKey(project.color) : "var(--md-primary)";

              return (
                <div className="pomo-session-item" key={session.id}>
                  <span className="dot" style={{ background: dotColor }} />
                  <span className="body-md pomo-session-target ellipsis">{targetName}</span>
                  <span className="body-sm muted pomo-session-time">{formatSessionTime(session.startedAt)}</span>
                  <span className="chip chip--small pomo-session-duration">
                    {session.minutes} 分钟
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
