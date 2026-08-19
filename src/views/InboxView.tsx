import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import {
  FilledButton,
  Checkbox,
  IconButton,
  OutlinedCard,
  OutlinedSegmentedButton,
  OutlinedSegmentedButtonSet,
  OutlinedTextField,
  TextButton,
  eventValue,
} from "../components/material";
import { ConfirmDialog, Dialog, useSnackbar } from "../components/ui";
import { useStore } from "../store/store";
import type { InboxItem, InboxItemKind } from "../types";

type InboxFilter = "all" | "todo" | "note";

function formatItemDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function InboxItemRow({
  item,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: InboxItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isTodo = item.kind === "todo";
  return (
    <div className={`inbox-item ${item.done ? "is-done" : ""}`}>
      {isTodo ? (
        <Checkbox
          className="inbox-item__checkbox"
          checked={item.done}
          aria-label={`标记「${item.content}」${item.done ? "未完成" : "已完成"}`}
          onChange={onToggle}
        />
      ) : (
        <span className="inbox-item__icon" aria-hidden="true">
          <Icon name="sticky_note_2" size={19} />
        </span>
      )}
      <button
        type="button"
        className="inbox-item__body"
        onClick={onEdit}
        aria-label={`编辑${isTodo ? "待办" : "备忘"}：${item.content}`}
      >
        <span className="inbox-item__content">{item.content}</span>
        <span className="inbox-item__meta">
          {isTodo ? "待办" : "备忘"} · {formatItemDate(item.updatedAt)}
        </span>
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
  onClose,
  onSave,
}: {
  item: InboxItem | null;
  onClose: () => void;
  onSave: (content: string) => void;
}) {
  const [content, setContent] = useState(item?.content ?? "");
  const [error, setError] = useState("");

  if (!item) return null;

  const save = () => {
    const nextContent = content.trim();
    if (!nextContent) {
      setError(item.kind === "todo" ? "请写下待办内容" : "请写下备忘内容");
      return;
    }
    onSave(nextContent);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={item.kind === "todo" ? "编辑待办" : "编辑备忘"}
      actions={
        <>
          <TextButton onClick={onClose}>取消</TextButton>
          <FilledButton onClick={save}>保存</FilledButton>
        </>
      }
    >
      <OutlinedTextField
        label={item.kind === "todo" ? "待办内容" : "备忘内容"}
        type={item.kind === "note" ? "textarea" : "text"}
        rows={item.kind === "note" ? 5 : undefined}
        value={content}
        onInput={(event) => {
          setContent(eventValue(event));
          setError("");
        }}
        autoFocus
      />
      {error && <p className="error-text body-sm mt-8">{error}</p>}
    </Dialog>
  );
}

export function InboxView() {
  const store = useStore();
  const { show } = useSnackbar();
  const [mode, setMode] = useState<InboxItemKind>("todo");
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [editing, setEditing] = useState<InboxItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InboxItem | null>(null);

  const todoCount = store.state.inboxItems.filter(
    (item) => item.kind === "todo" && !item.done,
  ).length;
  const noteCount = store.state.inboxItems.filter((item) => item.kind === "note").length;
  const completedCount = store.state.inboxItems.filter(
    (item) => item.kind === "todo" && item.done,
  ).length;

  const visibleItems = useMemo(
    () =>
      store.state.inboxItems.filter((item) => {
        if (filter === "all") return true;
        return item.kind === filter;
      }),
    [filter, store.state.inboxItems],
  );
  const pendingItems = visibleItems.filter((item) => item.kind === "note" || !item.done);
  const completedItems = visibleItems.filter((item) => item.kind === "todo" && item.done);

  const addItem = () => {
    const content = draft.trim();
    if (!content) return;
    store.addInboxItem({ kind: mode, content });
    setDraft("");
    show(mode === "todo" ? "待办已收下" : "备忘已收下");
  };

  const switchMode = (nextMode: InboxItemKind) => {
    setMode(nextMode);
    setDraft("");
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
            还没想好放在哪个项目？先放进这里。待办和灵感，都值得被好好接住。
          </p>
        </div>
        <div className="inbox-hero__summary" aria-label="收集箱概览">
          <div>
            <strong>{todoCount}</strong>
            <span>待办</span>
          </div>
          <div>
            <strong>{noteCount}</strong>
            <span>备忘</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>已完成</span>
          </div>
        </div>
      </section>

      <div className="inbox-layout">
        <OutlinedCard className="inbox-capture-card">
          <div className="inbox-card-heading">
            <div className="inbox-card-heading__icon">
              <Icon name="add" size={22} />
            </div>
            <div>
              <h2 className="title-md">快速收集</h2>
              <p className="body-sm muted">先记下来，不用现在分类。</p>
            </div>
          </div>
          <OutlinedSegmentedButtonSet className="segmented-control inbox-capture__modes">
            <OutlinedSegmentedButton
              label="待办"
              noCheckmark
              selected={mode === "todo"}
              onClick={() => switchMode("todo")}
            />
            <OutlinedSegmentedButton
              label="备忘"
              noCheckmark
              selected={mode === "note"}
              onClick={() => switchMode("note")}
            />
          </OutlinedSegmentedButtonSet>
          <form
            className="inbox-capture__form"
            onSubmit={(event) => {
              event.preventDefault();
              addItem();
            }}
          >
            <OutlinedTextField
              // Material Web caches the native control in its validator; remounting
              // prevents it from trying to assign `type` to a textarea when the mode changes.
              key={mode}
              label={mode === "todo" ? "想做什么？" : "想记点什么？"}
              type={mode === "note" ? "textarea" : "text"}
              rows={mode === "note" ? 7 : undefined}
              value={draft}
              onInput={(event) => setDraft(eventValue(event))}
              placeholder={
                mode === "todo" ? "例如：给家里的植物换盆" : "例如：下次想试试番茄工作法……"
              }
              autoFocus
            />
            <FilledButton type="submit" className="inbox-capture__submit">
              <Icon name={mode === "todo" ? "add_task" : "save"} size={18} slot="icon" />
              {mode === "todo" ? "收下待办" : "保存备忘"}
            </FilledButton>
          </form>
          <p className="inbox-capture__hint body-sm muted">
            {mode === "todo" ? "按 Enter 快速收下一个待办" : "可以写多行，适合记录一闪而过的想法"}
          </p>
        </OutlinedCard>

        <OutlinedCard className="inbox-list-card">
          <div className="inbox-list-toolbar">
            <div>
              <h2 className="title-md">我的收集</h2>
              <p className="body-sm muted">把零散想法变成下一步行动。</p>
            </div>
            <div className="inbox-filters" role="tablist" aria-label="收集箱筛选">
              {(
                [
                  ["all", "全部", store.state.inboxItems.length],
                  ["todo", "待办", todoCount + completedCount],
                  ["note", "备忘", noteCount],
                ] as [InboxFilter, string, number][]
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  className={`inbox-filter ${filter === value ? "is-selected" : ""}`}
                  onClick={() => setFilter(value)}
                >
                  {label}
                  <span>{count}</span>
                </button>
              ))}
            </div>
          </div>

          {pendingItems.length > 0 && (
            <InboxSection
              title={filter === "note" ? "备忘" : "待处理"}
              count={pendingItems.length}
            >
              {pendingItems.map((item) => (
                <InboxItemRow
                  key={item.id}
                  item={item}
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
                  onToggle={() => store.updateInboxItem(item.id, { done: !item.done })}
                  onEdit={() => setEditing(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </InboxSection>
          )}

          {visibleItems.length === 0 && (
            <div className="inbox-list-empty">
              <div className="inbox-list-empty__icon">
                <Icon name={filter === "note" ? "sticky_note_2" : "inbox"} size={30} />
              </div>
              <div className="title-md">
                {filter === "all" ? "这里还很安静" : filter === "todo" ? "没有待办" : "没有备忘"}
              </div>
              <p className="body-sm muted">
                {filter === "all"
                  ? "把脑海里的第一件事交给收集箱吧。"
                  : "切换上方类型，或从左侧快速收集。"}
              </p>
            </div>
          )}
        </OutlinedCard>
      </div>

      <InboxEditDialog
        key={editing?.id ?? "no-edit"}
        item={editing}
        onClose={() => setEditing(null)}
        onSave={(content) => {
          if (!editing) return;
          store.updateInboxItem(editing.id, { content });
          setEditing(null);
          show("内容已更新");
        }}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget?.kind === "todo" ? "删除待办" : "删除备忘"}
        message={`确定删除「${deleteTarget?.content ?? "这条内容"}」吗？`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          store.deleteInboxItem(deleteTarget.id);
          setDeleteTarget(null);
          show("内容已删除");
        }}
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
        <span className="inbox-section__count">{count}</span>
      </div>
      <div className="inbox-items">{children}</div>
    </section>
  );
}
