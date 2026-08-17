import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { Dialog, useSnackbar } from "../components/ui";
import { useStore } from "../store/store";
import type { PomodoroKind } from "../types";
import { formatDurationMinutes, todayISO } from "../utils/date";

const PHASES: { key: PomodoroKind; label: string }[] = [
  { key: "focus", label: "专注" },
  { key: "shortBreak", label: "短休息" },
  { key: "longBreak", label: "长休息" },
];

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

export function PomodoroView() {
  const store = useStore();
  const { state } = store;
  const { show } = useSnackbar();
  const s = state.settings;

  const [phase, setPhase] = useState<PomodoroKind>("focus");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(() => s.focusMinutes * 60_000);
  const [focusCount, setFocusCount] = useState(0);
  const [linkValue, setLinkValue] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const endAtRef = useRef(0);
  const phaseRef = useRef<PomodoroKind>("focus");
  const focusCountRef = useRef(0);
  const linkRef = useRef<{ projectId: string | null; taskId: string | null; dailyPlanId: string | null }>({ projectId: null, taskId: null, dailyPlanId: null });
  const settingsRef = useRef(s);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    focusCountRef.current = focusCount;
  }, [focusCount]);
  useEffect(() => {
    settingsRef.current = s;
  }, [s]);

  const durationOf = (p: PomodoroKind): number => {
    const cfg = settingsRef.current;
    if (p === "focus") return cfg.focusMinutes * 60_000;
    if (p === "shortBreak") return cfg.shortBreakMinutes * 60_000;
    return cfg.longBreakMinutes * 60_000;
  };

  const switchPhase = (p: PomodoroKind, autoStart = false) => {
    setPhase(p);
    setRunning(false);
    setRemaining(durationOf(p));
    if (autoStart) {
      endAtRef.current = Date.now() + durationOf(p);
      setRunning(true);
    }
  };

  const completePhase = () => {
    const cur = phaseRef.current;
    const cfg = settingsRef.current;
    setRunning(false);
    if (cur === "focus") {
      const endedAt = Date.now();
      store.addPomodoroSession({
        projectId: linkRef.current.projectId,
        taskId: linkRef.current.taskId,
        dailyPlanId: linkRef.current.dailyPlanId,
        kind: "focus",
        startedAt: endAtRef.current - cfg.focusMinutes * 60_000,
        endedAt,
        minutes: cfg.focusMinutes,
      });
      playBeep(3);
      const count = focusCountRef.current + 1;
      setFocusCount(count);
      const isLong = count % cfg.longBreakInterval === 0;
      show(isLong ? "专注完成！进入长休息" : "专注完成！进入短休息");
      switchPhase(isLong ? "longBreak" : "shortBreak", true);
    } else {
      playBeep(2);
      show("休息结束，开始新的专注");
      switchPhase("focus", true);
    }
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const rem = endAtRef.current - Date.now();
      if (rem <= 0) {
        setRemaining(0);
        completePhase();
      } else {
        setRemaining(rem);
      }
    }, 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const toggle = () => {
    if (running) {
      setRunning(false);
      setRemaining(endAtRef.current - Date.now());
    } else {
      endAtRef.current = Date.now() + remaining;
      setRunning(true);
    }
  };

  const reset = () => {
    setRunning(false);
    setFocusCount(0);
    setPhase("focus");
    setRemaining(durationOf("focus"));
  };

  const skip = () => {
    if (phaseRef.current === "focus") {
      const count = focusCount + 1;
      setFocusCount(count);
      const isLong = count % s.longBreakInterval === 0;
      switchPhase(isLong ? "longBreak" : "shortBreak", false);
    } else {
      switchPhase("focus", false);
    }
  };

  const linkOptions = useMemo(() => {
    const opts: { value: string; label: string; projectId: string | null; taskId: string | null; dailyPlanId: string | null }[] = [
      { value: "", label: "无（自由专注）", projectId: null, taskId: null, dailyPlanId: null },
    ];
    const activeProjectIds = new Set(
      state.projects.filter((project) => !project.archived).map((project) => project.id),
    );
    for (const p of state.projects.filter((project) => !project.archived)) {
      opts.push({ value: `p_${p.id}`, label: `项目 · ${p.name}`, projectId: p.id, taskId: null, dailyPlanId: null });
    }
    for (const t of state.tasks.filter((task) => activeProjectIds.has(task.projectId))) {
      const p = state.projects.find((x) => x.id === t.projectId);
      opts.push({ value: `t_${t.id}`, label: `任务 · ${p?.name ?? ""} · ${t.name}`, projectId: t.projectId, taskId: t.id, dailyPlanId: null });
    }
    for (const pl of state.dailyPlans.filter((plan) => !plan.projectId || activeProjectIds.has(plan.projectId))) {
      opts.push({ value: `pl_${pl.id}`, label: `计划 · ${pl.name}`, projectId: pl.projectId, taskId: pl.taskId, dailyPlanId: pl.id });
    }
    return opts;
  }, [state.projects, state.tasks, state.dailyPlans]);

  const onChangeLink = (value: string) => {
    setLinkValue(value);
    const opt = linkOptions.find((o) => o.value === value);
    linkRef.current = opt
      ? { projectId: opt.projectId, taskId: opt.taskId, dailyPlanId: opt.dailyPlanId }
      : { projectId: null, taskId: null, dailyPlanId: null };
  };

  const today = todayISO();
  const todaySessions = state.pomodoroSessions.filter((sess) => {
    const d = new Date(sess.endedAt);
    return sess.kind === "focus" && `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` === today;
  });
  const todayMinutes = todaySessions.reduce((acc, sess) => acc + sess.minutes, 0);

  const total = durationOf(phase);
  const progress = total > 0 ? remaining / total : 0;
  const R = 128;
  const C = 2 * Math.PI * R;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", paddingBottom: 48 }}>
      <div className="spread mb-16">
        <div className="title-lg">番茄钟</div>
        <div className="row gap-8">
          <div className="chip">
            <Icon name="check_circle" size={16} style={{ color: "#43A047" }} />
            今日 {todaySessions.length} 个 · {formatDurationMinutes(todayMinutes)}
          </div>
          <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="设置">
            <Icon name="settings" />
          </button>
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 24px" }}>
        <div className="segmented mb-16">
          {PHASES.map((p) => (
            <button key={p.key} className={`segment ${phase === p.key ? "active" : ""}`} onClick={() => switchPhase(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

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
          <button className="icon-btn" onClick={reset} title="重置" style={{ width: 48, height: 48 }}>
            <Icon name="replay" />
          </button>
          <button className="btn btn--filled" onClick={toggle} style={{ height: 56, padding: "0 40px", fontSize: 16 }}>
            <Icon name={running ? "pause" : "play_arrow"} />
            {running ? "暂停" : remaining < total ? "继续" : "开始"}
          </button>
          <button className="icon-btn" onClick={skip} title="跳过" style={{ width: 48, height: 48 }}>
            <Icon name="skip_next" />
          </button>
        </div>

        <div className="field" style={{ width: "100%", maxWidth: 420, marginTop: 24, marginBottom: 0 }}>
          <label className="field__label">本次专注对象</label>
          <select className="field__select" value={linkValue} onChange={(e) => onChangeLink(e.target.value)}>
            {linkOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card mt-16" style={{ padding: "14px 18px" }}>
        <div className="body-sm muted">
          专注 {s.focusMinutes} 分钟 · 短休息 {s.shortBreakMinutes} 分钟 · 长休息 {s.longBreakMinutes} 分钟 · 每 {s.longBreakInterval} 个番茄进入长休息。完成专注后会自动记录到统计中。
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSave={(patch) => {
          store.updateSettings(patch);
          setSettingsOpen(false);
          show("设置已保存");
          if (!running) {
            setRemaining(durationOf(phaseRef.current));
          }
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
    onSave({ focusMinutes: Math.round(f), shortBreakMinutes: Math.round(sh), longBreakMinutes: Math.round(lo), longBreakInterval: Math.round(it) });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="番茄钟设置"
      actions={
        <>
          <button className="btn btn--text" onClick={onClose}>取消</button>
          <button className="btn btn--filled" onClick={submit}>保存</button>
        </>
      }
    >
      <div className="field__row">
        <div className="field">
          <label className="field__label">专注时长（分钟）</label>
          <input className="field__input" type="number" min={1} value={focus} onChange={(e) => setFocus(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">短休息（分钟）</label>
          <input className="field__input" type="number" min={1} value={short} onChange={(e) => setShort(e.target.value)} />
        </div>
      </div>
      <div className="field__row">
        <div className="field">
          <label className="field__label">长休息（分钟）</label>
          <input className="field__input" type="number" min={1} value={long} onChange={(e) => setLong(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">长休息间隔（个）</label>
          <input className="field__input" type="number" min={1} value={interval} onChange={(e) => setIntervalVal(e.target.value)} />
        </div>
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
    </Dialog>
  );
}
