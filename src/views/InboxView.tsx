import { useMemo, useRef, useState, type ReactNode } from "react";
import type { InboxItem, Project } from "@task-orbit/core";
import type { MdOutlinedTextField } from "@material/web/textfield/outlined-text-field.js";
import { Icon } from "../components/Icon";
import {
  Checkbox,
  ChipSet,
  FilledButton,
  FilledCard,
  FilterChip,
  IconButton,
  OutlinedSelect,
  OutlinedTextField,
  Ripple,
  SelectOption,
  TonalButton,
  TextButton,
  eventValue,
} from "../components/material";
import { Badge, ConfirmDialog, Dialog, EmptyState, SectionHeader, useSnackbar } from "../components/ui";
import { useStore } from "../store/store";
import { useAiChat } from "../store/ai-chat-store";
import { useInboxViewState } from "../store/view-state";
import { colorByKey } from "../store/colors";

/** Keep in sync with --sys-motion-selection-duration used by .inbox-item exit. */
const ITEM_EXIT_MS = 200;

function formatItemDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

export function getFirstLine(content: string): string {
  const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
  return (line ?? content.split(/\r?\n/)[0] ?? "").trim();
}

function InboxItemRow({
  item,
  project,
  leaving = false,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: InboxItem;
  project?: Project | null;
  leaving?: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const projectColor = project ? colorByKey(project.color) : undefined;

  return (
    <div
      className={`inbox-item ${item.done ? "is-done" : ""} ${leaving ? "is-leaving" : ""}`}
    >
      <Checkbox
        className="inbox-item__checkbox"
        checked={item.done}
        aria-label={`标记「${getFirstLine(item.content)}」${item.done ? "未完成" : "已完成"}`}
        onChange={onToggle}
      />
      <button
        type="button"
        className="inbox-item__body"
        onClick={onEdit}
        aria-label={`编辑待办：${getFirstLine(item.content)}`}
      >
        <span className="inbox-item__content">
          {item.content}
        </span>
        <span className="inbox-item__meta">
          {project && (
            <span
              className="inbox-item__project-tag"
              style={{
                color: projectColor,
                borderColor: `color-mix(in srgb, ${projectColor} 30%, transparent)`,
              }}
            >
              <span
                className="inbox-item__project-dot"
                style={{ backgroundColor: projectColor }}
              />
              {project.name}
            </span>
          )}
          <span>{formatItemDate(item.updatedAt)}</span>
        </span>
        <Ripple />
      </button>
      <div className="inbox-item__actions">
        <IconButton aria-label="编辑" title="编辑" onClick={onEdit}>
          <Icon name="edit" size={18} />
        </IconButton>
        <IconButton aria-label="删除" title="删除" onClick={onDelete}>
          <Icon name="delete" size={18} />
        </IconButton>
      </div>
    </div>
  );
}

function InboxEditDialog({
  item,
  projects,
  onClose,
  onSave,
}: {
  item: InboxItem | null;
  projects: Project[];
  onClose: () => void;
  onSave: (patch: { content: string; projectId: string | null }) => void;
}) {
  const [content, setContent] = useState(item?.content ?? "");
  const [projectId, setProjectId] = useState<string | null>(item?.projectId ?? null);
  const [error, setError] = useState("");

  if (!item) return null;

  const save = () => {
    const nextContent = content.trim();
    if (!nextContent) {
      setError("请写下待办内容");
      return;
    }
    onSave({ content: nextContent, projectId });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="编辑待办"
      className="inbox-edit-dialog"
      actions={
        <>
          <TextButton onClick={onClose}>取消</TextButton>
          <FilledButton onClick={save}>保存</FilledButton>
        </>
      }
    >
      <form
        className="inbox-edit-dialog__form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
      >
        <OutlinedTextField
          className="inbox-edit-dialog__field"
          label="待办内容"
          type="textarea"
          rows={6}
          value={content}
          onInput={(event) => {
            setContent(eventValue(event));
            setError("");
          }}
          autoFocus
        />
        <div className="inbox-edit-dialog__project">
          <OutlinedSelect
            label="关联项目"
            value={projectId ?? ""}
            onChange={(event) => {
              const val = eventValue(event);
              setProjectId(val ? val : null);
            }}
          >
            <SelectOption value="" selected={!projectId}>
              <span slot="headline">不关联项目</span>
            </SelectOption>
            {projects.map((p) => (
              <SelectOption
                key={p.id}
                value={p.id}
                selected={projectId === p.id}
              >
                <span slot="headline" className="inbox-project-option">
                  <span
                    className="inbox-project-option__dot"
                    style={{ backgroundColor: colorByKey(p.color) }}
                  />
                  {p.name}
                </span>
              </SelectOption>
            ))}
          </OutlinedSelect>
        </div>
        {error && <p className="error-text body-sm mt-8">{error}</p>}
      </form>
    </Dialog>
  );
}

function ProjectFilterDialog({
  open,
  projects,
  projectCounts,
  unassignedCount,
  selectedProjectId,
  onClose,
  onSelect,
}: {
  open: boolean;
  projects: Project[];
  projectCounts: Map<string, number>;
  unassignedCount: number;
  selectedProjectId: string;
  onClose: () => void;
  onSelect: (projectId: string) => void;
}) {
  if (!open) return null;

  return (
    <Dialog
      open
      compact
      onClose={onClose}
      title="按项目筛选"
      className="inbox-project-filter-dialog"
      actions={<TextButton onClick={onClose}>关闭</TextButton>}
    >
      <div className="inbox-project-filter-list" role="listbox">
        <button
          type="button"
          className={`inbox-project-filter-item ${selectedProjectId === "all" ? "is-selected" : ""}`}
          onClick={() => {
            onSelect("all");
            onClose();
          }}
        >
          <span className="inbox-project-filter-item__icon">
            <Icon name="folder_open" size={18} />
          </span>
          <span className="inbox-project-filter-item__name">全部项目</span>
          {selectedProjectId === "all" && <Icon name="check" size={18} />}
          <Ripple />
        </button>

        <button
          type="button"
          className={`inbox-project-filter-item ${selectedProjectId === "none" ? "is-selected" : ""}`}
          onClick={() => {
            onSelect("none");
            onClose();
          }}
        >
          <span className="inbox-project-filter-item__icon">
            <Icon name="folder_off" size={18} />
          </span>
          <span className="inbox-project-filter-item__name">未关联项目</span>
          <span className="inbox-project-filter-item__count">{unassignedCount} 条</span>
          {selectedProjectId === "none" && <Icon name="check" size={18} />}
          <Ripple />
        </button>

        {projects.length > 0 && <div className="inbox-project-filter-divider" />}

        {projects.map((project) => {
          const count = projectCounts.get(project.id) ?? 0;
          const isSelected = selectedProjectId === project.id;
          const color = colorByKey(project.color);
          return (
            <button
              key={project.id}
              type="button"
              className={`inbox-project-filter-item ${isSelected ? "is-selected" : ""}`}
              onClick={() => {
                onSelect(project.id);
                onClose();
              }}
            >
              <span
                className="inbox-project-filter-item__dot"
                style={{ backgroundColor: color }}
              />
              <span className="inbox-project-filter-item__name">{project.name}</span>
              <span className="inbox-project-filter-item__count">{count} 条</span>
              {isSelected && <Icon name="check" size={18} />}
              <Ripple />
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}

export function InboxView() {
  const store = useStore();
  const { show } = useSnackbar();
  const {
    statusFilter,
    setStatusFilter,
    projectFilter,
    setProjectFilter,
    draft,
    setDraft,
    draftProjectId,
    setDraftProjectId,
  } = useInboxViewState();

  const [editing, setEditing] = useState<InboxItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InboxItem | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const captureInputRef = useRef<MdOutlinedTextField | null>(null);

  const activeProjects = useMemo(
    () => store.state.projects.filter((p) => !p.archived),
    [store.state.projects],
  );

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of store.state.projects) {
      map.set(p.id, p);
    }
    return map;
  }, [store.state.projects]);

  const totalCount = store.state.inboxItems.length;
  const activeCount = store.state.inboxItems.filter((item) => !item.done).length;
  const completedCount = store.state.inboxItems.filter((item) => item.done).length;
  const unassignedCount = store.state.inboxItems.filter((item) => item.projectId === null).length;

  const projectItemCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of store.state.inboxItems) {
      if (item.projectId) {
        map.set(item.projectId, (map.get(item.projectId) ?? 0) + 1);
      }
    }
    return map;
  }, [store.state.inboxItems]);

  const selectedFilterProject = useMemo(() => {
    if (projectFilter === "all" || projectFilter === "none") return null;
    return store.state.projects.find((p) => p.id === projectFilter) ?? null;
  }, [projectFilter, store.state.projects]);

  const visibleItems = useMemo(
    () =>
      store.state.inboxItems.filter((item) => {
        if (statusFilter === "active" && item.done) return false;
        if (statusFilter === "completed" && !item.done) return false;

        if (projectFilter === "none" && item.projectId !== null) return false;
        if (
          projectFilter !== "all" &&
          projectFilter !== "none" &&
          item.projectId !== projectFilter
        ) {
          return false;
        }

        return true;
      }),
    [statusFilter, projectFilter, store.state.inboxItems],
  );

  const pendingItems = visibleItems.filter((item) => !item.done);
  const completedItems = visibleItems.filter((item) => item.done);

  const addItem = () => {
    const content = draft.trim();
    if (!content) return;
    store.addInboxItem({
      content,
      projectId: draftProjectId,
    });
    setDraft("");
    setDraftProjectId(null);
    show("待办已收下");
  };

  const focusCapture = () => {
    captureInputRef.current?.focus();
  };

  const { openDrawer, sendMessage } = useAiChat();

  const handleAiOrganize = () => {
    const pendingTotal = store.state.inboxItems.filter((i) => !i.done).length;
    if (pendingTotal === 0) {
      show("当前收集箱没有待处理的条目");
      return;
    }
    openDrawer();
    void sendMessage(
      "请帮我整理当前收集箱中未处理的内容。先获取未处理收集箱条目和已有项目列表，分析它们适合归入哪个项目或转化为具体日程计划，并调用 plan_inbox_organization 提出整理方案。",
    );
  };

  // Animate the row out before removing it from state.
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setLeavingId(id);
    window.setTimeout(() => {
      store.deleteInboxItem(id);
      setLeavingId(null);
      show("待办已删除");
    }, ITEM_EXIT_MS);
  };

  return (
    <div className="inbox-view">
      <section className="inbox-hero">
        <div className="inbox-hero__copy">
          <div className="inbox-eyebrow">
            <Icon name="bolt" size={17} fill />
            随手记下，稍后整理
          </div>
          <h1 className="headline-lg">收集箱</h1>
          <p className="body-md muted">
            还没想好放在哪个项目？先放进这里。待办与灵感，都值得被好好接住。
          </p>
        </div>
        <div className="inbox-hero__summary" aria-label="收集箱概览">
          <div>
            <strong>{activeCount}</strong>
            <span>待处理</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>已完成</span>
          </div>
          <div>
            <strong>{totalCount}</strong>
            <span>全部待办</span>
          </div>
        </div>
      </section>

      <div className="inbox-layout">
        <FilledCard className="material-card inbox-capture-card">
          <div className="inbox-card-heading">
            <div className="inbox-card-heading__icon">
              <Icon name="add" size={22} />
            </div>
            <div>
              <h2 className="title-md">快速收集</h2>
              <p className="body-sm inbox-capture__sub">随时记下待办，支持选择关联项目。</p>
            </div>
          </div>
          <form
            className="inbox-capture__form"
            onSubmit={(event) => {
              event.preventDefault();
              addItem();
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                addItem();
              }
            }}
          >
            <OutlinedTextField
              ref={captureInputRef}
              label="想做什么？"
              type="textarea"
              rows={3}
              value={draft}
              onInput={(event) => setDraft(eventValue(event))}
              placeholder="例如：给家里的植物换盆&#10;支持多行文本，按 Ctrl+Enter 快速收下"
              autoFocus
            />
            <OutlinedSelect
              label="关联项目"
              value={draftProjectId ?? ""}
              onChange={(event) => {
                const val = eventValue(event);
                setDraftProjectId(val ? val : null);
              }}
            >
              <SelectOption value="" selected={!draftProjectId}>
                <span slot="headline">不关联项目</span>
              </SelectOption>
              {activeProjects.map((p) => (
                <SelectOption
                  key={p.id}
                  value={p.id}
                  selected={draftProjectId === p.id}
                >
                  <span slot="headline" className="inbox-project-option">
                    <span
                      className="inbox-project-option__dot"
                      style={{ backgroundColor: colorByKey(p.color) }}
                    />
                    {p.name}
                  </span>
                </SelectOption>
              ))}
            </OutlinedSelect>
            <FilledButton type="submit" className="inbox-capture__submit">
              <Icon name="add_task" size={18} slot="icon" />
              收下待办
            </FilledButton>
          </form>
          <p className="inbox-capture__hint body-sm inbox-capture__sub">
            支持记录多行文本，按 Ctrl+Enter 快速收下。
          </p>
        </FilledCard>

        <FilledCard className="material-card inbox-list-card">
          <div className="inbox-list-toolbar">
            <SectionHeader
              title="我的待办"
              subtitle="把零散想法变成下一步行动。"
              actions={
                <TonalButton onClick={handleAiOrganize} aria-label="AI 智能整理收集箱">
                  <Icon name="auto_awesome" size={18} slot="icon" />
                  AI 整理
                </TonalButton>
              }
            />
            <div className="inbox-toolbar-filter-row">
              <ChipSet className="inbox-filters" role="tablist" aria-label="按状态筛选">
                <FilterChip
                  role="tab"
                  aria-selected={statusFilter === "all"}
                  selected={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                >
                  全部 · {totalCount}
                </FilterChip>
                <FilterChip
                  role="tab"
                  aria-selected={statusFilter === "active"}
                  selected={statusFilter === "active"}
                  onClick={() => setStatusFilter("active")}
                >
                  待处理 · {activeCount}
                </FilterChip>
                <FilterChip
                  role="tab"
                  aria-selected={statusFilter === "completed"}
                  selected={statusFilter === "completed"}
                  onClick={() => setStatusFilter("completed")}
                >
                  已完成 · {completedCount}
                </FilterChip>
              </ChipSet>

              <div className="inbox-filter-right">
                <TonalButton
                  className={`inbox-project-filter-trigger ${projectFilter !== "all" ? "is-filtered" : ""}`}
                  onClick={() => setFilterDialogOpen(true)}
                  aria-label="按项目筛选待办"
                >
                  <Icon name="tune" size={18} slot="icon" />
                  {selectedFilterProject ? (
                    <span className="inbox-btn-project">
                      <span
                        className="inbox-chip-project__dot"
                        style={{ backgroundColor: colorByKey(selectedFilterProject.color) }}
                      />
                      {selectedFilterProject.name}
                    </span>
                  ) : projectFilter === "none" ? (
                    "未关联"
                  ) : (
                    "按项目筛选"
                  )}
                  <Icon name="arrow_drop_down" size={18} slot="icon" />
                </TonalButton>

                {projectFilter !== "all" && (
                  <IconButton
                    aria-label="清除项目筛选"
                    title="清除项目筛选"
                    onClick={() => setProjectFilter("all")}
                  >
                    <Icon name="close" size={16} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>

          {pendingItems.length > 0 && (
            <InboxSection title="待处理" count={pendingItems.length}>
              {pendingItems.map((item) => (
                <InboxItemRow
                  key={item.id}
                  item={item}
                  project={item.projectId ? projectMap.get(item.projectId) : null}
                  leaving={leavingId === item.id}
                  onToggle={() => store.updateInboxItem(item.id, { done: !item.done })}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </InboxSection>
          )}

          {completedItems.length > 0 && (
            <InboxSection title="已完成" count={completedItems.length} muted>
              {completedItems.map((item) => (
                <InboxItemRow
                  key={item.id}
                  item={item}
                  project={item.projectId ? projectMap.get(item.projectId) : null}
                  leaving={leavingId === item.id}
                  onToggle={() => store.updateInboxItem(item.id, { done: !item.done })}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </InboxSection>
          )}

          {visibleItems.length === 0 && (
            <div className="inbox-empty-container">
              <EmptyState
                icon="inbox"
                title="这里还很安静"
                hint={
                  totalCount === 0
                    ? "把脑海里的第一件事交给收集箱吧。"
                    : "当前筛选条件下没有待办事项。"
                }
                action={
                  <TonalButton className="inbox-empty-cta" onClick={focusCapture}>
                    <Icon name="add" size={18} slot="icon" /> 收下第一件事
                  </TonalButton>
                }
              />
            </div>
          )}
        </FilledCard>
      </div>

      <ProjectFilterDialog
        open={filterDialogOpen}
        projects={activeProjects}
        projectCounts={projectItemCounts}
        unassignedCount={unassignedCount}
        selectedProjectId={projectFilter}
        onClose={() => setFilterDialogOpen(false)}
        onSelect={(id) => setProjectFilter(id)}
      />

      <InboxEditDialog
        key={editing?.id ?? "no-edit"}
        item={editing}
        projects={activeProjects}
        onClose={() => setEditing(null)}
        onSave={({ content, projectId }) => {
          if (!editing) return;
          store.updateInboxItem(editing.id, { content, projectId });
          setEditing(null);
          show("待办已更新");
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除待办"
        message={`确定删除「${(deleteTarget ? getFirstLine(deleteTarget.content) : "") || "这条待办"}」吗？`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function InboxSection({
  title,
  count,
  muted = false,
  children,
}: {
  title: string;
  count: number;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`inbox-section ${muted ? "is-muted" : ""}`}>
      <div className="inbox-section__heading">
        <span className="label-lg">{title}</span>
        <Badge value={count} variant={muted ? "neutral" : "primary"} />
      </div>
      <div className="inbox-items">{children}</div>
    </section>
  );
}
