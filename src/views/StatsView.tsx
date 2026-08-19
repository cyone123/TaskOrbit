import { useMemo } from "react";
import {
  addDays,
  formatDurationMinutes,
  parseISODate,
  resolveSessionProjectId,
  selectFocusSessions,
  startOfWeek,
  toISODate,
} from "@task-orbit/core";
import { Icon } from "../components/Icon";
import { FilledCard, LinearProgress } from "../components/material";
import { colorByKey } from "../store/colors";
import { useStore } from "../store/store";

function isoOfTimestamp(ts: number): string {
  const d = new Date(ts);
  return toISODate(d);
}

export function StatsView() {
  const { state } = useStore();
  const sessions = state.pomodoroSessions;

  const focusSessions = useMemo(() => selectFocusSessions(state), [sessions, state]);

  const now = new Date();
  const today = toISODate(now);
  const weekStartISO = toISODate(startOfWeek(now));

  const last7 = useMemo(() => {
    const arr: string[] = [];
    for (let i = 6; i >= 0; i--) arr.push(toISODate(addDays(now, -i)));
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

  const minutesByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of focusSessions) {
      const iso = isoOfTimestamp(s.endedAt);
      map.set(iso, (map.get(iso) ?? 0) + s.minutes);
    }
    return map;
  }, [focusSessions]);

  const todayMinutes = minutesByDay.get(today) ?? 0;
  const weekMinutes = focusSessions
    .filter((s) => isoOfTimestamp(s.endedAt) >= weekStartISO)
    .reduce((a, s) => a + s.minutes, 0);
  const todayCount = focusSessions.filter((s) => isoOfTimestamp(s.endedAt) === today).length;
  const weekCount = focusSessions.filter((s) => isoOfTimestamp(s.endedAt) >= weekStartISO).length;

  const maxDay = Math.max(1, ...last7.map((d) => minutesByDay.get(d) ?? 0));

  const projectMinutes = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of focusSessions) {
      const pid = resolveSessionProjectId(s, state);
      if (pid) map.set(pid, (map.get(pid) ?? 0) + s.minutes);
    }
    return map;
  }, [focusSessions, state]);

  const projectLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const session of focusSessions) {
      const projectId = resolveSessionProjectId(session, state);
      if (!projectId || map.has(projectId)) continue;
      const project = state.projects.find((item) => item.id === projectId);
      map.set(projectId, project?.name ?? session.projectNameSnapshot ?? "已删除项目");
    }
    return map;
  }, [focusSessions, state]);

  const maxProject = Math.max(1, ...[...projectMinutes.values()]);

  const taskTotal = state.tasks.length;
  const taskDone = state.tasks.filter((t) => t.done).length;
  const planTotal = state.dailyPlans.length;
  const planDone = state.dailyPlans.filter((p) => p.done).length;

  const summary = [
    { icon: "timer", label: "今日专注", value: formatDurationMinutes(todayMinutes), sub: `${todayCount} 个番茄` },
    { icon: "calendar_view_week", label: "本周专注", value: formatDurationMinutes(weekMinutes), sub: `${weekCount} 个番茄` },
    { icon: "check_circle", label: "任务完成", value: `${taskDone}/${taskTotal}`, sub: taskTotal ? `${Math.round((taskDone / taskTotal) * 100)}%` : "暂无任务" },
    { icon: "event_available", label: "计划完成", value: `${planDone}/${planTotal}`, sub: planTotal ? `${Math.round((planDone / planTotal) * 100)}%` : "暂无计划" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 48 }}>
      <div className="title-lg mb-16">时间统计</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {summary.map((c) => (
          <FilledCard className="material-card" key={c.label}>
            <div className="row gap-8 muted">
              <Icon name={c.icon} size={18} />
              <span className="label-md">{c.label}</span>
            </div>
            <div className="title-lg" style={{ fontSize: 24, marginTop: 8 }}>{c.value}</div>
            <div className="body-sm muted mt-8">{c.sub}</div>
          </FilledCard>
        ))}
      </div>

      <FilledCard className="material-card mt-16">
        <div className="title-md mb-16">近 7 天专注时长</div>
        <div className="bar-chart">
          {last7.map((iso) => {
            const mins = minutesByDay.get(iso) ?? 0;
            const d = parseISODate(iso);
            const heightPct = Math.max(2, Math.round((mins / maxDay) * 100));
            const isT = iso === today;
            return (
              <div className="bar-chart__col" key={iso}>
                <span className="body-sm muted">{mins > 0 ? `${mins}′` : ""}</span>
                <div
                  className="bar-chart__bar"
                  style={{ height: `${heightPct}%`, background: isT ? "var(--md-primary)" : "var(--md-primary-container)" }}
                  title={`${iso}: ${mins} 分钟`}
                />
                <span className="body-sm muted" style={{ fontWeight: isT ? 600 : 400, color: isT ? "var(--md-primary)" : undefined }}>
                  {d.getMonth() + 1}/{d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
      </FilledCard>

      <FilledCard className="material-card mt-16">
        <div className="title-md mb-16">各项目专注时长</div>
        {projectMinutes.size === 0 ? (
          <div className="body-sm muted">暂无专注记录，开始一个番茄钟试试吧。</div>
        ) : (
          <div className="col gap-12">
            {[...projectMinutes.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([pid, mins]) => {
                const proj = state.projects.find((p) => p.id === pid);
                const color = proj ? colorByKey(proj.color) : "#9e9e9e";
                return (
                  <div key={pid}>
                    <div className="spread mb-8">
                      <div className="row gap-8">
                        <span className="dot" style={{ background: color }} />
                        <span className="body-md">{proj?.name ?? projectLabels.get(pid) ?? "已删除项目"}</span>
                      </div>
                      <span className="body-md muted">{formatDurationMinutes(mins)}</span>
                    </div>
                    <LinearProgress
                      className="progress--project"
                      value={mins}
                      max={maxProject}
                      style={{ "--md-linear-progress-active-indicator-color": color } as React.CSSProperties}
                      aria-label={`${proj?.name ?? projectLabels.get(pid) ?? "项目"}专注进度`}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </FilledCard>

      <FilledCard className="material-card mt-16">
        <div className="title-md mb-16">任务与计划完成率</div>
        <div className="col gap-12">
          <div>
            <div className="spread mb-8">
              <span className="body-md">任务</span>
              <span className="body-sm muted">{taskDone} / {taskTotal}</span>
            </div>
            <LinearProgress
              value={taskTotal ? (taskDone / taskTotal) * 100 : 0}
              max={100}
              aria-label="任务完成率"
            />
          </div>
          <div>
            <div className="spread mb-8">
              <span className="body-md">每日计划</span>
              <span className="body-sm muted">{planDone} / {planTotal}</span>
            </div>
            <LinearProgress
              className="progress--success"
              value={planTotal ? (planDone / planTotal) * 100 : 0}
              max={100}
              aria-label="每日计划完成率"
            />
          </div>
        </div>
      </FilledCard>
    </div>
  );
}
