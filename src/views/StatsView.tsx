import { useMemo, useState, type CSSProperties } from "react";
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
import { LinearProgress } from "../components/material";
import { EmptyState, SectionHeader, StatCard } from "../components/ui";
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

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const weekHasData = last7.some((iso) => (minutesByDay.get(iso) ?? 0) > 0);
  const avgDay = Math.round(
    last7.reduce((sum, iso) => sum + (minutesByDay.get(iso) ?? 0), 0) / 7,
  );
  const selectedMins = selectedDay ? minutesByDay.get(selectedDay) ?? 0 : 0;

  return (
    <div className="page-shell page-shell--medium">
      <div className="headline-md mb-16">时间统计</div>

      {/* Hero KPI — the one number that matters most, in primary-container. */}
      <section className="stats-hero">
        <div className="stats-hero__icon">
          <Icon name="timer" size={28} />
        </div>
        <div className="stats-hero__copy">
          <span className="label-lg">今日专注</span>
          <strong className="stats-hero__value tabular-nums">
            {formatDurationMinutes(todayMinutes)}
          </strong>
          <span className="body-sm">
            {todayCount > 0 ? `今日 ${todayCount} 个番茄，继续加油` : "今天还没有专注记录"}
          </span>
        </div>
        <Icon
          className="stats-hero__spark"
          name="local_fire_department"
          size={44}
        />
      </section>

      <div className="stat-grid stats-secondary-grid">
        <StatCard
          title="本周专注"
          value={formatDurationMinutes(weekMinutes)}
          subtitle={`${weekCount} 个番茄`}
          icon="calendar_view_week"
          colorVariant="secondary"
        />
        <StatCard
          title="任务完成"
          value={`${taskDone}/${taskTotal}`}
          subtitle={taskTotal ? `${Math.round((taskDone / taskTotal) * 100)}% 完成率` : "暂无任务"}
          icon="check_circle"
          colorVariant="tertiary"
        />
        <StatCard
          title="计划完成"
          value={`${planDone}/${planTotal}`}
          subtitle={planTotal ? `${Math.round((planDone / planTotal) * 100)}% 完成率` : "暂无计划"}
          icon="event_available"
          colorVariant="success"
        />
      </div>

      <section className="stats-panel">
        <SectionHeader
          title="近 7 天专注时长"
          subtitle={selectedDay ? `${selectedDay} · 专注 ${formatDurationMinutes(selectedMins)}` : "点击柱形查看某天的专注时长"}
        />
        {!weekHasData ? (
          <EmptyState
            icon="hourglass_empty"
            title="最近 7 天还没有专注记录"
            hint="去番茄钟页开始第一个番茄吧"
          />
        ) : (
          <>
            <div className="bar-chart">
              <div
                className="bar-chart__avg"
                style={{ bottom: `${Math.max(4, Math.round((avgDay / maxDay) * 100))}%` }}
                title={`日均 ${avgDay} 分钟`}
              >
                <span className="body-sm">日均 {avgDay}′</span>
              </div>
              {last7.map((iso) => {
                const mins = minutesByDay.get(iso) ?? 0;
                const d = parseISODate(iso);
                const heightPct = Math.max(2, Math.round((mins / maxDay) * 100));
                const isT = iso === today;
                const isSelected = selectedDay === iso;
                return (
                  <div className="bar-chart__col" key={iso}>
                    <span className="body-sm muted bar-chart__value">
                      {mins > 0 ? `${mins}′` : ""}
                    </span>
                    <button
                      type="button"
                      className={`bar-chart__bar${isT ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                      style={{ height: `${heightPct}%`, ...eventTone(isT) }}
                      onClick={() => setSelectedDay(isSelected ? null : iso)}
                      aria-pressed={isSelected}
                      aria-label={`${d.getMonth() + 1}月${d.getDate()}日专注 ${mins} 分钟`}
                      title={`${iso}: ${mins} 分钟`}
                    />
                    <span
                      className={`body-sm muted bar-chart__label${isT ? " is-today" : ""}`}
                    >
                      {d.getMonth() + 1}/{d.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="body-sm muted bar-chart-detail">
              {selectedDay
                ? `${selectedDay} · 专注 ${formatDurationMinutes(selectedMins)}`
                : "点击柱形查看某天的专注时长"}
            </div>
          </>
        )}
      </section>

      <section className="stats-panel">
        <SectionHeader
          title="各项目专注时长"
          subtitle="按专注时长排序"
        />
        {projectMinutes.size === 0 ? (
          <EmptyState
            icon="folder_off"
            title="暂无项目专注记录"
            hint="在番茄钟中关联项目后，这里会按时长排序"
          />
        ) : (
          <div className="col gap-12">
            {[...projectMinutes.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([pid, mins]) => {
                const proj = state.projects.find((p) => p.id === pid);
                const color = proj ? colorByKey(proj.color) : "var(--md-outline)";
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
                      style={{ "--md-linear-progress-active-indicator-color": color } as CSSProperties}
                      aria-label={`${proj?.name ?? projectLabels.get(pid) ?? "项目"}专注进度`}
                    />
                  </div>
                );
              })}
          </div>
        )}
      </section>

      <section className="stats-panel">
        <SectionHeader
          title="任务与计划完成率"
        />
        <div className="col gap-12">
          <div>
            <div className="spread mb-8">
              <span className="body-md">任务</span>
              <span className="body-sm muted">{taskDone} / {taskTotal}</span>
            </div>
            <LinearProgress
              className="progress--tertiary"
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
      </section>
    </div>
  );
}

/** Bars read today vs. past days from tokens instead of inline colors. */
function eventTone(isTodayBar: boolean): CSSProperties {
  return isTodayBar
    ? ({ "--bar-color": "var(--md-primary)" } as CSSProperties)
    : ({ "--bar-color": "var(--md-secondary)" } as CSSProperties);
}
