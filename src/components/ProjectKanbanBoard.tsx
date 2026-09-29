import { useState, useMemo, type DragEvent } from "react";
import {
  relativeRangeLabel,
  type DailyPlan,
  type Priority,
  type Project,
  type Task,
  type TaskStatus,
} from "@task-orbit/core";
import { Icon } from "./Icon";
import { Checkbox, IconButton, TextButton } from "./material";
import { Badge } from "./ui";
import { useStore } from "../store/store";

const PRIORITY_CONFIG: Record<Priority, { label: string; icon: string }> = {
  high: { label: "高优", icon: "flag" },
  medium: { label: "中优", icon: "drag_handle" },
  low: { label: "低优", icon: "south" },
};

interface ProjectKanbanBoardProps {
  project: Project;
  tasks: Task[];
  dailyPlans: DailyPlan[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenNote: (taskId: string) => void;
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  icon: string;
  badgeVariant: "neutral" | "primary" | "success";
  emptyHint: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: "todo",
    title: "待处理",
    icon: "assignment",
    badgeVariant: "neutral",
    emptyHint: "暂无待处理任务，点击下方按钮添加",
  },
  {
    status: "in_progress",
    title: "进行中",
    icon: "hourglass_top",
    badgeVariant: "primary",
    emptyHint: "没有推进中的任务，点击卡片「开始推进」进入",
  },
  {
    status: "done",
    title: "已完成",
    icon: "task_alt",
    badgeVariant: "success",
    emptyHint: "尚未有完成的任务，加油推进吧",
  },
];

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

export function ProjectKanbanBoard({
  project: _project,
  tasks,
  dailyPlans,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onOpenNote,
}: ProjectKanbanBoardProps) {
  const store = useStore();
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Group plans by taskId
  const plansByTask = useMemo(() => {
    const map = new Map<string, DailyPlan[]>();
    for (const plan of dailyPlans) {
      if (!plan.taskId) continue;
      const list = map.get(plan.taskId) ?? [];
      list.push(plan);
      map.set(plan.taskId, list);
    }
    return map;
  }, [dailyPlans]);

  // Group tasks by status
  const columnsData = useMemo(() => {
    const todo: Task[] = [];
    const inProgress: Task[] = [];
    const done: Task[] = [];

    for (const task of tasks) {
      if (task.status === "in_progress") {
        inProgress.push(task);
      } else if (task.status === "done") {
        done.push(task);
      } else {
        todo.push(task);
      }
    }

    return {
      todo,
      in_progress: inProgress,
      done,
    };
  }, [tasks]);

  // Drag & drop handlers
  const handleDragStart = (e: DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, colStatus: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== colStatus) {
      setDragOverCol(colStatus);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, colStatus: TaskStatus) => {
    // Only clear if leaving the column itself, not entering a child element
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !e.currentTarget.contains(related)) {
      if (dragOverCol === colStatus) {
        setDragOverCol(null);
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    setDraggingTaskId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    store.updateTask(taskId, { status: targetStatus });
  };

  return (
    <div className="project-kanban-board" role="region" aria-label="项目任务看板">
      <div className="project-kanban-columns">
        {COLUMNS.map((col) => {
          const colTasks = columnsData[col.status];
          const isOver = dragOverCol === col.status;

          return (
            <div
              key={col.status}
              className={`project-kanban-column project-kanban-column--${col.status} ${
                isOver ? "is-drag-over" : ""
              }`}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column Header */}
              <div className="project-kanban-column__header">
                <div className="project-kanban-column__title-row">
                  <span className={`project-kanban-column__dot project-kanban-column__dot--${col.status}`} />
                  <span className="title-md project-kanban-column__title">{col.title}</span>
                  <Badge value={colTasks.length} variant={col.badgeVariant} />
                </div>
                {col.status === "todo" && (
                  <IconButton
                    aria-label="添加新任务"
                    title="添加新任务"
                    onClick={onAddTask}
                    className="project-kanban-add-btn"
                  >
                    <Icon name="add" size={18} />
                  </IconButton>
                )}
              </div>

              {/* Column Body / Cards List */}
              <div className="project-kanban-column__cards">
                {colTasks.length === 0 ? (
                  <div className="project-kanban-empty">
                    <Icon name={col.icon} size={28} />
                    <span>{col.emptyHint}</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const taskPlans = plansByTask.get(task.id) ?? [];
                    const donePlansCount = taskPlans.filter((p) => p.done).length;
                    const isDragging = draggingTaskId === task.id;
                    const priorityMeta = PRIORITY_CONFIG[task.priority];

                    return (
                      <div
                        key={task.id}
                        className={`project-kanban-card project-kanban-card--${task.status} ${
                          isDragging ? "is-dragging" : ""
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* Top bar: Checkbox + Priority Pill + Actions */}
                        <div className="project-kanban-card__top">
                          <div className="project-kanban-card__check-group">
                            <Checkbox
                              checked={task.done}
                              aria-label={`标记任务「${task.name}」${task.done ? "未完成" : "已完成"}`}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => {
                                if (task.done) {
                                  // When unchecking, reset status to todo
                                  store.updateTask(task.id, { done: false, status: "todo" });
                                } else {
                                  // When checking, set status to done
                                  store.updateTask(task.id, { done: true, status: "done" });
                                }
                              }}
                            />
                            <span
                              className={`project-priority-pill project-priority-pill--${task.priority}`}
                              title={`优先级: ${priorityMeta.label}`}
                            >
                              <Icon name={priorityMeta.icon} size={12} />
                              <span>{priorityMeta.label}</span>
                            </span>
                          </div>

                          <div className="project-kanban-card__actions">
                            <IconButton
                              aria-label={task.description ? "查看即时笔记" : "添加即时笔记"}
                              title={task.description ? "查看即时笔记（已有内容）" : "添加即时笔记"}
                              className={task.description ? "project-row-action--has-note" : ""}
                              onClick={() => onOpenNote(task.id)}
                            >
                              <Icon
                                name={task.description ? "note_alt" : "edit_note"}
                                size={16}
                                style={task.description ? { color: "var(--md-primary)" } : undefined}
                              />
                            </IconButton>
                            <IconButton
                              aria-label="编辑任务"
                              title="编辑任务"
                              onClick={() => onEditTask(task)}
                            >
                              <Icon name="edit" size={16} />
                            </IconButton>
                            <IconButton
                              aria-label="删除任务"
                              title="删除任务"
                              onClick={() => onDeleteTask(task)}
                            >
                              <Icon name="delete" size={16} />
                            </IconButton>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="project-kanban-card__content">
                          <div className="project-kanban-card__title">{task.name}</div>
                          {task.description && (
                            <div className="project-kanban-card__desc">
                              {stripHtml(task.description)}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Metadata and Status Flow Button */}
                        <div className="project-kanban-card__footer">
                          <div className="project-kanban-card__meta">
                            <span className="body-sm muted project-kanban-card__date">
                              <Icon name="event" size={14} />
                              {relativeRangeLabel(task.startDate, task.endDate)}
                            </span>
                            {taskPlans.length > 0 && (
                              <span
                                className="chip chip--small project-kanban-card__plans-chip"
                                title={`关联 ${taskPlans.length} 个计划，已完成 ${donePlansCount} 个`}
                              >
                                <Icon name="schedule" size={13} />
                                {donePlansCount}/{taskPlans.length} 计划
                              </span>
                            )}
                          </div>

                          {/* Action Button: Disappears when Done */}
                          {task.status === "todo" && (
                            <button
                              type="button"
                              className="project-kanban-btn project-kanban-btn--start"
                              title="将任务设为进行中"
                              onClick={() => store.updateTask(task.id, { status: "in_progress" })}
                            >
                              <Icon name="play_arrow" size={16} />
                              <span>开始推进</span>
                            </button>
                          )}

                          {task.status === "in_progress" && (
                            <button
                              type="button"
                              className="project-kanban-btn project-kanban-btn--pause"
                              title="将任务退回待处理状态"
                              onClick={() => store.updateTask(task.id, { status: "todo" })}
                            >
                              <Icon name="undo" size={15} />
                              <span>设为待处理</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
