import { useMemo, useState } from "react";
import { PROJECT_COLORS, colorByKey } from "../store/colors";
import { useStore } from "../store/store";
import type { DailyPlan, Priority, Project, Task } from "../types";
import { addDays, toISODate, todayISO } from "../utils/date";
import { Icon } from "./Icon";

interface FormActionProps {
  onCancel: () => void;
  submitLabel?: string;
}
function FormActions({ onCancel, submitLabel = "保存" }: FormActionProps) {
  return (
    <div className="dialog__actions">
      <button className="btn btn--text" onClick={onCancel}>
        取消
      </button>
      <button className="btn btn--filled" type="submit">
        {submitLabel}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Project form                                                               */
/* -------------------------------------------------------------------------- */

export interface ProjectFormProps {
  initial?: Project | null;
  onSubmit: (input: {
    name: string;
    description: string;
    color: string;
    startDate: string;
    endDate: string;
  }) => void;
  onCancel: () => void;
}

export function ProjectForm({ initial, onSubmit, onCancel }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [color, setColor] = useState(initial?.color ?? PROJECT_COLORS[0].key);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? toISODate(addDays(new Date(), 14)),
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("请输入项目名称");
    if (endDate < startDate) return setError("结束日期不能早于开始日期");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      color,
      startDate,
      endDate,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="field">
        <label className="field__label">名称</label>
        <input
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：产品发布"
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field__label">描述</label>
        <textarea
          className="field__textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="项目说明（可选）"
        />
      </div>
      <div className="field">
        <label className="field__label">颜色</label>
        <div className="row row--wrap gap-8">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`color-dot ${color === c.key ? "selected" : ""}`}
              style={{ background: c.hex }}
              onClick={() => setColor(c.key)}
              title={c.name}
            />
          ))}
        </div>
      </div>
      <div className="field__row">
        <div className="field">
          <label className="field__label">开始日期</label>
          <input
            className="field__input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label">结束日期</label>
          <input
            className="field__input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
      <FormActions onCancel={onCancel} submitLabel={initial ? "保存" : "创建项目"} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Task form                                                                  */
/* -------------------------------------------------------------------------- */

export interface TaskFormProps {
  initial?: Task | null;
  projectId: string;
  onSubmit: (input: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    priority: Priority;
  }) => void;
  onCancel: () => void;
}

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "high", label: "高", color: "#E53935" },
  { key: "medium", label: "中", color: "#F9A825" },
  { key: "low", label: "低", color: "#43A047" },
];

export function TaskForm({ initial, onSubmit, onCancel }: TaskFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? toISODate(addDays(new Date(), 7)),
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) return setError("请输入任务名称");
    if (endDate < startDate) return setError("结束日期不能早于开始日期");
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      startDate,
      endDate,
      priority,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="field">
        <label className="field__label">名称</label>
        <input
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：UI 设计"
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field__label">描述</label>
        <textarea
          className="field__textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="任务说明（可选）"
        />
      </div>
      <div className="field">
        <label className="field__label">优先级</label>
        <div className="segmented">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`segment ${priority === p.key ? "active" : ""}`}
              onClick={() => setPriority(p.key)}
            >
              <span className="dot" style={{ background: p.color }} />
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field__row">
        <div className="field">
          <label className="field__label">开始日期</label>
          <input
            className="field__input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label">结束日期</label>
          <input
            className="field__input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
      <FormActions onCancel={onCancel} submitLabel={initial ? "保存" : "创建任务"} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Daily plan form                                                            */
/* -------------------------------------------------------------------------- */

export interface DailyPlanFormProps {
  initial?: DailyPlan | null;
  lockProject?: boolean;
  lockTask?: boolean;
  defaultDate?: string;
  onSubmit: (input: {
    projectId: string | null;
    taskId: string | null;
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    estimatedMinutes: number;
  }) => void;
  onCancel: () => void;
}

export function DailyPlanForm({
  initial,
  lockProject = false,
  lockTask = false,
  defaultDate,
  onSubmit,
  onCancel,
}: DailyPlanFormProps) {
  const { state } = useStore();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? "");
  const [taskId, setTaskId] = useState<string>(initial?.taskId ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [error, setError] = useState("");

  const tasksOfProject = useMemo(
    () => state.tasks.filter((t) => t.projectId === projectId),
    [state.tasks, projectId],
  );

  const changeProject = (value: string) => {
    setProjectId(value);
    setTaskId("");
  };

  const submit = () => {
    if (!name.trim()) return setError("请输入计划名称");
    if (!date) return setError("请选择日期");
    if (endTime <= startTime) return setError("结束时间必须晚于开始时间");
    onSubmit({
      projectId: projectId || null,
      taskId: taskId || null,
      name: name.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      estimatedMinutes: 60,
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="field">
        <label className="field__label">名称</label>
        <input
          className="field__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：晨间阅读"
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field__label">描述</label>
        <textarea
          className="field__textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="计划说明（可选）"
        />
      </div>

      <div className="field__row">
        <div className="field">
          <label className="field__label">所属项目</label>
          {lockProject ? (
            <div className="chip chip--fill">
              <span
                className="dot"
                style={{ background: projectId ? colorByKey(state.projects.find((p) => p.id === projectId)?.color ?? "") : "var(--md-outline)" }}
              />
              {projectId
                ? state.projects.find((p) => p.id === projectId)?.name ?? "无"
                : "无项目（独立）"}
            </div>
          ) : (
            <select
              className="field__select"
              value={projectId}
              onChange={(e) => changeProject(e.target.value)}
            >
              <option value="">无项目（独立）</option>
              {state.projects.filter((p) => !p.archived).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="field">
          <label className="field__label">所属任务</label>
          {lockTask ? (
            <div className="chip">
              {taskId
                ? state.tasks.find((t) => t.id === taskId)?.name ?? "无"
                : "无任务（独立）"}
            </div>
          ) : (
            <select
              className="field__select"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={!projectId}
            >
              <option value="">无任务（独立）</option>
              {tasksOfProject.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="field">
        <label className="field__label">执行日期</label>
        <input
          className="field__input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="field__row">
        <div className="field">
          <label className="field__label">开始时间</label>
          <input
            className="field__input"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label">结束时间</label>
          <input
            className="field__input"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="error-text body-sm">{error}</p>}
      <FormActions onCancel={onCancel} submitLabel={initial ? "保存" : "添加计划"} />
    </form>
  );
}
