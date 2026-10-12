import { useMemo, useRef, useState } from "react";
import {
  MAX_DAILY_PLAN_REPEAT_COUNT,
  addDays,
  dailyPlanRepeatLabel,
  toISODate,
  todayISO,
  type DailyPlan,
  type DailyPlanRepeat,
  type Priority,
  type Project,
  type Task,
} from "@task-orbit/core";
import { PROJECT_COLORS, colorByKey, contrastText, normalizeHex } from "../store/colors";
import { Icon } from "./Icon";
import { DatePicker } from "./DatePicker";
import { TimePicker } from "./TimePicker";
import { useStore } from "../store/store";
import {
  Checkbox,
  FilledButton,
  OutlinedSegmentedButton,
  OutlinedSegmentedButtonSet,
  OutlinedSelect,
  OutlinedTextField,
  SelectOption,
  TextButton,
  eventValue,
} from "./material";

interface FormActionProps {
  onCancel: () => void;
  submitLabel?: string;
}
function FormActions({ onCancel, submitLabel = "保存" }: FormActionProps) {
  return (
    <div className="dialog__actions">
      <TextButton type="button" onClick={onCancel}>
        取消
      </TextButton>
      <FilledButton type="submit">
        {submitLabel}
      </FilledButton>
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
  const [customColor, setCustomColor] = useState<string | null>(() => {
    if (initial?.color && !PROJECT_COLORS.some((c) => c.key === initial.color)) {
      return normalizeHex(initial.color);
    }
    return null;
  });
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? toISODate(addDays(new Date(), 14)),
  );
  const [error, setError] = useState("");

  const isCustomColor = !PROJECT_COLORS.some((c) => c.key === color);
  const activeCustomHex = normalizeHex(
    isCustomColor ? color : (customColor ?? colorByKey(color)),
  );

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomColor(val);
    setColor(val);
  };

  const handleOpenColorPicker = () => {
    if (!isCustomColor && customColor) {
      setColor(customColor);
    }
    if (colorInputRef.current) {
      if (typeof colorInputRef.current.showPicker === "function") {
        try {
          colorInputRef.current.showPicker();
        } catch {
          colorInputRef.current.click();
        }
      } else {
        colorInputRef.current.click();
      }
    }
  };

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
        <OutlinedTextField
          label="名称"
          value={name}
          onInput={(event) => setName(eventValue(event))}
          placeholder="例如：产品发布"
          autoFocus
        />
      </div>
      <div className="field">
        <OutlinedTextField
          label="描述"
          type="textarea"
          rows={3}
          value={description}
          onInput={(event) => setDescription(eventValue(event))}
          placeholder="项目说明（可选）"
        />
      </div>
      <div className="field">
        <div className="spread">
          <label className="field__label">颜色</label>
          {isCustomColor && (
            <span
              className="label-sm muted"
              style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
              title={`当前自定义颜色: ${activeCustomHex.toUpperCase()}`}
            >
              {activeCustomHex.toUpperCase()}
            </span>
          )}
        </div>
        <div className="row row--wrap gap-8">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`color-dot ${color === c.key ? "selected" : ""}`}
              style={{ background: c.hex }}
              onClick={() => setColor(c.key)}
              title={c.name}
              aria-label={c.name}
            />
          ))}
          <button
            type="button"
            className={`color-dot color-dot--custom ${isCustomColor ? "selected" : ""}`}
            style={{
              background: isCustomColor ? activeCustomHex : "var(--md-surface-container-high)",
            }}
            onClick={handleOpenColorPicker}
            title={isCustomColor ? `自定义颜色 (${activeCustomHex.toUpperCase()})` : "自定义颜色（调色盘）"}
            aria-label={isCustomColor ? `自定义颜色 (${activeCustomHex.toUpperCase()})` : "自定义颜色（调色盘）"}
          >
            <Icon
              name="palette"
              size={16}
              style={{
                color: isCustomColor ? contrastText(activeCustomHex) : "inherit",
              }}
            />
          </button>
          <input
            ref={colorInputRef}
            type="color"
            value={activeCustomHex}
            onInput={handleCustomColorChange}
            onChange={handleCustomColorChange}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="field__row">
        <div className="field">
          <DatePicker
            label="开始日期"
            value={startDate}
            onChange={setStartDate}
            max={endDate}
            align="left"
          />
        </div>
        <div className="field">
          <DatePicker
            label="结束日期"
            value={endDate}
            onChange={setEndDate}
            min={startDate}
            align="right"
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
  projectId?: string;
  allowChangeProject?: boolean;
  projects?: Project[];
  defaultName?: string;
  defaultDescription?: string;
  onSubmit: (input: {
    name: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
    priority: Priority;
    projectId?: string;
  }) => void;
  onCancel: () => void;
}

const PRIORITIES: { key: Priority; label: string; color: string }[] = [
  { key: "high", label: "高", color: "var(--md-error)" },
  { key: "medium", label: "中", color: "var(--color-warning)" },
  { key: "low", label: "低", color: "var(--color-success)" },
];

export function TaskForm({
  initial,
  projectId = "",
  allowChangeProject = false,
  projects = [],
  defaultName = "",
  defaultDescription = "",
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    initial?.projectId ?? projectId ?? projects[0]?.id ?? "",
  );
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [description, setDescription] = useState(initial?.description ?? defaultDescription);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [noSchedule, setNoSchedule] = useState(
    initial ? !initial.startDate || !initial.endDate : true,
  );
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO());
  const [endDate, setEndDate] = useState(
    initial?.endDate ?? toISODate(addDays(new Date(), 7)),
  );
  const [error, setError] = useState("");

  const submit = () => {
    if (allowChangeProject && !selectedProjectId) {
      return setError("请选择所属项目");
    }
    if (!name.trim()) return setError("请输入任务名称");
    if (!noSchedule) {
      if (!startDate || !endDate) return setError("请选择开始和结束日期");
      if (endDate < startDate) return setError("结束日期不能早于开始日期");
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      startDate: noSchedule ? null : startDate,
      endDate: noSchedule ? null : endDate,
      priority,
      projectId: allowChangeProject ? selectedProjectId : (projectId || selectedProjectId),
    });
  };

  const selectedProjectColor = selectedProjectId
    ? colorByKey(projects.find((p) => p.id === selectedProjectId)?.color)
    : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {allowChangeProject && (
        <div className="field">
          <OutlinedSelect
            label="所属项目"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(eventValue(event))}
            menuPositioning="fixed"
          >
            {selectedProjectColor && (
              <span slot="leading-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24 }}>
                <span
                  className="project-select-option__dot"
                  style={{ backgroundColor: selectedProjectColor }}
                />
              </span>
            )}
            {projects.map((p) => (
              <SelectOption key={p.id} value={p.id} selected={selectedProjectId === p.id}>
                <span slot="headline" className="project-select-option">
                  <span
                    className="project-select-option__dot"
                    style={{ backgroundColor: colorByKey(p.color) }}
                  />
                  {p.name}
                </span>
              </SelectOption>
            ))}
          </OutlinedSelect>
        </div>
      )}
      <div className="field">
        <OutlinedTextField
          label="名称"
          value={name}
          onInput={(event) => setName(eventValue(event))}
          placeholder="例如：UI 设计"
          autoFocus
        />
      </div>
      <div className="field">
        <OutlinedTextField
          label="描述"
          type="textarea"
          rows={3}
          value={description}
          onInput={(event) => setDescription(eventValue(event))}
          placeholder="任务说明（可选）"
        />
      </div>
      <div className="field">
        <div className="field__label">优先级</div>
        <OutlinedSegmentedButtonSet className="segmented-control">
          {PRIORITIES.map((p) => (
            <OutlinedSegmentedButton
              key={p.key}
              label={p.label}
              noCheckmark
              selected={priority === p.key}
              onClick={() => setPriority(p.key)}
            />
          ))}
        </OutlinedSegmentedButtonSet>
      </div>
      <div className="field">
        <div
          className="row gap-8 align-center"
          style={{ cursor: "pointer", userSelect: "none", width: "fit-content" }}
          onClick={() => setNoSchedule((v) => !v)}
        >
          <Checkbox
            id="task-no-schedule"
            checked={noSchedule}
            aria-label="暂不排期（进入待处理）"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              setNoSchedule((e.target as HTMLInputElement).checked);
            }}
          />
          <label
            htmlFor="task-no-schedule"
            className="body-md"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setNoSchedule((v) => !v);
            }}
          >
            暂不排期（进入待处理）
          </label>
        </div>
      </div>
      {!noSchedule && (
        <div className="field__row">
          <div className="field">
            <DatePicker
              label="开始日期"
              value={startDate}
              onChange={setStartDate}
              max={endDate}
              align="left"
            />
          </div>
          <div className="field">
            <DatePicker
              label="结束日期"
              value={endDate}
              onChange={setEndDate}
              min={startDate}
              align="right"
            />
          </div>
        </div>
      )}
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
  defaultProjectId?: string | null;
  defaultTaskId?: string | null;
  lockProject?: boolean;
  lockTask?: boolean;
  defaultDate?: string;
  defaultName?: string;
  defaultDescription?: string;
  onSubmit: (input: {
    projectId: string | null;
    taskId: string | null;
    name: string;
    description: string;
    date: string;
    startTime: string;
    endTime: string;
    estimatedMinutes: number;
    repeat: DailyPlanRepeat;
    repeatCount: number;
  }) => void;
  onCancel: () => void;
}

export function DailyPlanForm({
  initial,
  defaultProjectId,
  defaultTaskId,
  lockProject = false,
  lockTask = false,
  defaultDate,
  defaultName = "",
  defaultDescription = "",
  onSubmit,
  onCancel,
}: DailyPlanFormProps) {
  const { state } = useStore();
  const [name, setName] = useState(initial?.name ?? defaultName);
  const [description, setDescription] = useState(initial?.description ?? defaultDescription);
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? defaultProjectId ?? "");
  const [taskId, setTaskId] = useState<string>(initial?.taskId ?? defaultTaskId ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayISO());
  const [startTime, setStartTime] = useState(initial?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "10:00");
  const [repeat, setRepeat] = useState<DailyPlanRepeat>(initial?.recurrence.frequency ?? "none");
  const [repeatCount, setRepeatCount] = useState(
    String(initial?.recurrence.count && initial.recurrence.count > 1 ? initial.recurrence.count : "2"),
  );
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
    const parsedRepeatCount = repeat === "none" ? 1 : Number(repeatCount);
    if (
      repeat !== "none" &&
      (!Number.isInteger(parsedRepeatCount) ||
        parsedRepeatCount < 2 ||
        parsedRepeatCount > MAX_DAILY_PLAN_REPEAT_COUNT)
    ) {
      return setError(`重复次数必须是 2-${MAX_DAILY_PLAN_REPEAT_COUNT} 之间的整数`);
    }
    onSubmit({
      projectId: projectId || null,
      taskId: taskId || null,
      name: name.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      estimatedMinutes: 60,
      repeat,
      repeatCount: parsedRepeatCount,
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
        <OutlinedTextField
          label="名称"
          value={name}
          onInput={(event) => setName(eventValue(event))}
          placeholder="例如：晨间阅读"
          autoFocus
        />
      </div>
      <div className="field">
        <OutlinedTextField
          label="描述"
          type="textarea"
          rows={3}
          value={description}
          onInput={(event) => setDescription(eventValue(event))}
          placeholder="计划说明（可选）"
        />
      </div>

      <div className="field__row">
        <div className="field">
          <OutlinedSelect
            label="重复"
            value={repeat}
            onChange={(event) => setRepeat(eventValue(event) as DailyPlanRepeat)}
            menuPositioning="fixed"
          >
            {(["none", "daily", "weekly", "monthly"] as DailyPlanRepeat[]).map((value) => (
              <SelectOption key={value} value={value} selected={repeat === value}>
                <span slot="headline">{dailyPlanRepeatLabel(value)}</span>
              </SelectOption>
            ))}
          </OutlinedSelect>
        </div>
        {repeat !== "none" && (
          <div className="field">
            <OutlinedTextField
              label="重复次数（含首次）"
              type="number"
              value={repeatCount}
              onInput={(event) => setRepeatCount(eventValue(event))}
            />
          </div>
        )}
      </div>
      {repeat !== "none" && (
        <p className="body-sm muted mt-8">
          {initial
            ? `将从 ${date} 开始按 ${repeatCount || "0"} 个${dailyPlanRepeatLabel(repeat)}计划实例配置。`
            : `将从 ${date} 开始创建 ${repeatCount || "0"} 个${dailyPlanRepeatLabel(repeat)}计划实例。`}
        </p>
      )}

      <div className="field__row">
        <div className="field">
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
            <OutlinedSelect
              label="所属项目"
              value={projectId}
              onChange={(event) => changeProject(eventValue(event))}
              menuPositioning="fixed"
            >
              {projectId && (
                <span slot="leading-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24 }}>
                  <span
                    className="project-select-option__dot"
                    style={{ backgroundColor: colorByKey(state.projects.find((p) => p.id === projectId)?.color) }}
                  />
                </span>
              )}
              <SelectOption value="" selected={projectId === ""}>
                <span slot="headline">无项目（独立）</span>
              </SelectOption>
              {state.projects.filter((p) => !p.archived).map((p) => (
                <SelectOption key={p.id} value={p.id} selected={projectId === p.id}>
                  <span slot="headline" className="project-select-option">
                    <span
                      className="project-select-option__dot"
                      style={{ backgroundColor: colorByKey(p.color) }}
                    />
                    {p.name}
                  </span>
                </SelectOption>
              ))}
            </OutlinedSelect>
          )}
        </div>

        <div className="field">
          {lockTask ? (
            <div className="chip">
              {taskId
                ? state.tasks.find((t) => t.id === taskId)?.name ?? "无"
                : "无任务（独立）"}
            </div>
          ) : (
            <OutlinedSelect
              label="所属任务"
              value={taskId}
              onChange={(event) => setTaskId(eventValue(event))}
              disabled={!projectId}
              menuPositioning="fixed"
            >
              <SelectOption value="" selected={taskId === ""}>
                <span slot="headline">无任务（独立）</span>
              </SelectOption>
              {tasksOfProject.map((t) => (
                <SelectOption key={t.id} value={t.id} selected={taskId === t.id}>
                  <span slot="headline">{t.name}</span>
                </SelectOption>
              ))}
            </OutlinedSelect>
          )}
        </div>
      </div>

      <div className="field">
        <DatePicker
          label="执行日期"
          value={date}
          onChange={setDate}
        />
      </div>

      <div className="field__row">
        <div className="field">
          <TimePicker
            label="开始时间"
            value={startTime}
            onChange={setStartTime}
            max={endTime}
            align="left"
          />
        </div>
        <div className="field">
          <TimePicker
            label="结束时间"
            value={endTime}
            onChange={setEndTime}
            min={startTime}
            align="right"
          />
        </div>
      </div>

      {error && <p className="error-text body-sm">{error}</p>}
      <FormActions onCancel={onCancel} submitLabel={initial ? "保存" : "添加计划"} />
    </form>
  );
}
