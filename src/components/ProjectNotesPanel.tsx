import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  uid,
  type AppState,
  type DailyPlan,
  type Project,
  type Task,
  type VaultSettings,
} from "@task-orbit/core";
import { Icon } from "./Icon";
import {
  Checkbox,
  FilledButton,
  IconButton,
  OutlinedButton,
  OutlinedTextField,
  Switch,
  TextButton,
  eventValue,
} from "./material";
import { ConfirmDialog, Dialog, SearchBar, useSnackbar } from "./ui";
import { isTauri } from "../store/persistence";
import {
  chooseVaultDirectory,
  createVault,
  deleteNote,
  openNoteInObsidian,
  readNote,
  scanNotes,
  writeNote,
  type ProjectNote,
  type ProjectNoteSummary,
} from "../store/vault";
import { useStore } from "../store/store";
import { LiveMarkdownEditor } from "./LiveMarkdownEditor";

interface ProjectNotesPanelProps {
  project: Project;
  state: AppState;
}

interface NoteDraft {
  title: string;
  markdown: string;
  pinned: boolean;
  taskIds: string[];
  dailyPlanIds: string[];
}

function draftFromNote(note: ProjectNote): NoteDraft {
  return {
    title: note.title,
    markdown: note.markdown,
    pinned: note.pinned,
    taskIds: [...note.taskIds],
    dailyPlanIds: [...note.dailyPlanIds],
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function vaultNameFromPath(path: string): string {
  return path.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "Obsidian Vault";
}

function normalizeNotesFolder(value: string): string {
  return value
    .trim()
    .replace(/[\\/]+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function noteDate(timestamp: number): string {
  if (!timestamp) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function updateUniqueIds(ids: string[], id: string, checked: boolean): string[] {
  if (checked) return ids.includes(id) ? ids : [...ids, id];
  return ids.filter((value) => value !== id);
}

function targetLabel(
  id: string,
  kind: "task" | "plan",
  tasks: Task[],
  plans: DailyPlan[],
): string {
  const item = kind === "task"
    ? tasks.find((task) => task.id === id)
    : plans.find((plan) => plan.id === id);
  return item?.name ?? "关联对象已失效";
}

export function ProjectNotesPanel({ project, state }: ProjectNotesPanelProps) {
  const store = useStore();
  const { show } = useSnackbar();
  const settings = state.vaultSettings;
  const projectTasks = useMemo(
    () => state.tasks.filter((task) => task.projectId === project.id),
    [project.id, state.tasks],
  );
  const projectPlans = useMemo(
    () => state.dailyPlans
      .filter((plan) => plan.projectId === project.id)
      .sort((left, right) => `${left.date}-${left.startTime}`.localeCompare(`${right.date}-${right.startTime}`)),
    [project.id, state.dailyPlans],
  );

  const [notes, setNotes] = useState<ProjectNoteSummary[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [note, setNote] = useState<ProjectNote | null>(null);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editorMode, setEditorMode] = useState<"live" | "source">("live");
  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [associationOpen, setAssociationOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createVaultOpen, setCreateVaultOpen] = useState(false);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [vaultName, setVaultName] = useState("");
  const [notesFolderDraft, setNotesFolderDraft] = useState(settings.notesFolder);
  const [autoReloadDraft, setAutoReloadDraft] = useState(settings.autoReload);
  const [openWithObsidianDraft, setOpenWithObsidianDraft] = useState(settings.openWithObsidian);
  const scanRequestRef = useRef(0);
  const loadRequestRef = useRef(0);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return notes;
    return notes.filter((item) => `${item.title} ${item.relativePath}`.toLocaleLowerCase().includes(query));
  }, [notes, search]);

  const applySettings = useCallback((patch: Partial<VaultSettings>) => {
    store.updateVaultSettings(patch);
    setError(null);
  }, [store]);

  const refreshNotes = useCallback(async () => {
    if (!settings.enabled || !settings.rootPath) {
      setNotes([]);
      return;
    }
    const currentRequest = ++scanRequestRef.current;
    try {
      const result = await scanNotes(settings);
      if (currentRequest !== scanRequestRef.current) return;
      setNotes(result.filter((item) => item.projectId === project.id));
      setError(null);
    } catch (scanError) {
      if (currentRequest === scanRequestRef.current) setError(errorMessage(scanError));
    }
  }, [project.id, settings]);

  const loadNote = useCallback(async (relativePath: string) => {
    if (!settings.enabled || !settings.rootPath) return;
    const currentRequest = ++loadRequestRef.current;
    setLoading(true);
    try {
      const loaded = await readNote(settings, relativePath);
      if (currentRequest !== loadRequestRef.current) return;
      setSelectedPath(relativePath);
      setNote(loaded);
      setDraft(draftFromNote(loaded));
      setDirty(false);
      setError(null);
    } catch (readError) {
      if (currentRequest === loadRequestRef.current) setError(errorMessage(readError));
    } finally {
      if (currentRequest === loadRequestRef.current) setLoading(false);
    }
  }, [settings]);

  const saveDraft = useCallback(async (nextDraft = draft): Promise<boolean> => {
    if (!note || !nextDraft || !settings.enabled || !settings.rootPath) return false;
    const previousPath = note.relativePath;
    setSaving(true);
    try {
      const saved = await writeNote(settings, {
        id: note.id,
        projectId: project.id,
        title: nextDraft.title.trim() || "未命名笔记",
        markdown: nextDraft.markdown,
        relativePath: note.relativePath,
        pinned: nextDraft.pinned,
        taskIds: nextDraft.taskIds,
        dailyPlanIds: nextDraft.dailyPlanIds,
        expectedContentHash: note.contentHash,
        projectFolder: project.name,
      });
      setNote(saved);
      setDraft(draftFromNote(saved));
      setSelectedPath(saved.relativePath);
      setNotes((current) => {
        const previousIndex = current.findIndex((item) => item.relativePath === previousPath);
        const next = current.filter(
          (item) => item.relativePath !== previousPath && item.relativePath !== saved.relativePath,
        );
        next.splice(previousIndex >= 0 ? Math.min(previousIndex, next.length) : 0, 0, saved);
        return next;
      });
      setDirty(false);
      setError(null);
      return true;
    } catch (saveError) {
      setError(errorMessage(saveError));
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, note, project.id, project.name, settings]);

  const selectNote = useCallback(async (summary: ProjectNoteSummary) => {
    if (summary.relativePath === selectedPath) return;
    if (dirty && !(await saveDraft())) return;
    await loadNote(summary.relativePath);
  }, [dirty, loadNote, saveDraft, selectedPath]);

  useEffect(() => {
    setNotes([]);
    setSelectedPath(null);
    setNote(null);
    setDraft(null);
    setDirty(false);
    setSearch("");
    setError(null);
  }, [project.id, settings.notesFolder, settings.rootPath]);

  useEffect(() => {
    void refreshNotes();
  }, [refreshNotes]);

  useEffect(() => {
    if (!selectedPath && filteredNotes.length > 0 && !dirty) {
      void loadNote(filteredNotes[0].relativePath);
    }
  }, [dirty, filteredNotes, loadNote, selectedPath]);

  useEffect(() => {
    if (selectedPath && !dirty && !notes.some((item) => item.relativePath === selectedPath)) {
      setSelectedPath(null);
      setNote(null);
      setDraft(null);
    }
  }, [dirty, notes, selectedPath]);

  useEffect(() => {
    if (!settings.enabled || !settings.autoReload) return undefined;
    const timer = window.setInterval(() => {
      if (!dirty) void refreshNotes();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [dirty, refreshNotes, settings.autoReload, settings.enabled]);

  useEffect(() => {
    if (!note || dirty) return;
    const summary = notes.find((item) => item.relativePath === note.relativePath);
    if (summary && summary.contentHash !== note.contentHash) void loadNote(note.relativePath);
  }, [dirty, loadNote, note, notes]);

  useEffect(() => {
    if (!dirty || !note || saving) return undefined;
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [dirty, draft, note, saveDraft, saving]);

  useEffect(() => {
    setNotesFolderDraft(settings.notesFolder);
    setAutoReloadDraft(settings.autoReload);
    setOpenWithObsidianDraft(settings.openWithObsidian);
  }, [settings.autoReload, settings.notesFolder, settings.openWithObsidian]);

  const updateDraft = (patch: Partial<NoteDraft>) => {
    setDraft((current) => current ? { ...current, ...patch } : current);
    setDirty(true);
  };

  const chooseExistingVault = async () => {
    try {
      const path = await chooseVaultDirectory();
      if (!path) return;
      const folder = normalizeNotesFolder(notesFolderDraft) || "Task Orbit/Notes";
      applySettings({
        enabled: true,
        rootPath: path,
        vaultName: vaultNameFromPath(path),
        notesFolder: folder,
      });
      setSetupOpen(false);
      setSettingsOpen(false);
      show("已连接 Obsidian Vault");
    } catch (selectError) {
      setError(errorMessage(selectError));
    }
  };

  const chooseParent = async () => {
    try {
      const path = await chooseVaultDirectory();
      if (path) setParentPath(path);
    } catch (selectError) {
      setError(errorMessage(selectError));
    }
  };

  const submitCreateVault = async () => {
    if (!parentPath) {
      setError("请选择新 Vault 的存放位置。");
      return;
    }
    if (!vaultName.trim()) {
      setError("请输入 Vault 名称。");
      return;
    }
    const folder = normalizeNotesFolder(notesFolderDraft) || "Task Orbit/Notes";
    try {
      const created = await createVault(parentPath, vaultName.trim(), folder);
      applySettings({
        enabled: true,
        rootPath: created.rootPath,
        vaultName: created.vaultName,
        notesFolder: created.notesFolder,
      });
      setCreateVaultOpen(false);
      setSetupOpen(false);
      setSettingsOpen(false);
      setParentPath(null);
      show("已创建并连接 Obsidian Vault");
    } catch (createError) {
      setError(errorMessage(createError));
    }
  };

  const openCreateDialog = () => {
    setVaultName(`${project.name} Vault`);
    setParentPath(null);
    setError(null);
    setCreateVaultOpen(true);
  };

  const openSettingsDialog = () => {
    setNotesFolderDraft(settings.notesFolder);
    setAutoReloadDraft(settings.autoReload);
    setOpenWithObsidianDraft(settings.openWithObsidian);
    setError(null);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    const folder = normalizeNotesFolder(notesFolderDraft);
    if (!folder) {
      setError("笔记目录不能为空。");
      return;
    }
    applySettings({
      notesFolder: folder,
      autoReload: autoReloadDraft,
      openWithObsidian: openWithObsidianDraft,
    });
    setSettingsOpen(false);
    show("笔记设置已保存");
  };

  const deleteCurrentNote = async () => {
    if (!note || !settings.enabled || !settings.rootPath) return;
    if (!note.relativePath) {
      setDeleteOpen(false);
      setNote(null);
      setDraft(null);
      setSelectedPath(null);
      setDirty(false);
      return;
    }
    try {
      await deleteNote(settings, note.relativePath);
      setDeleteOpen(false);
      setNote(null);
      setDraft(null);
      setSelectedPath(null);
      setDirty(false);
      await refreshNotes();
      show("笔记已删除");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  const setupActions = (
    <div className="project-notes-setup-actions">
      <FilledButton onClick={() => void chooseExistingVault()}>
        <Icon name="folder_open" size={18} slot="icon" /> 连接现有 Vault
      </FilledButton>
      <OutlinedButton onClick={openCreateDialog}>
        <Icon name="create_new_folder" size={18} slot="icon" /> 新建 Vault
      </OutlinedButton>
    </div>
  );

  if (!settings.enabled || !settings.rootPath) {
    return (
      <section className="project-notes-panel project-notes-panel--setup">
        <div className="project-notes-setup-icon"><Icon name="menu_book" size={34} /></div>
        <div className="title-lg">把项目笔记放进 Obsidian</div>
        <p className="body-md muted project-notes-setup-copy">
          连接现有 Vault 或新建一个笔记库。Task Orbit 会使用 Markdown 和 YAML Properties 保存项目、任务与每日计划的稳定 ID。
        </p>
        {!isTauri() && <p className="body-sm project-notes-browser-hint">请在 Task Orbit 桌面应用中启用 Vault 文件功能。</p>}
        {setupActions}
        <button type="button" className="project-notes-learn-more" onClick={() => setSetupOpen(true)}>
          查看存储说明 <Icon name="arrow_forward" size={17} />
        </button>
        <VaultSetupDialog
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          onChooseExisting={() => void chooseExistingVault()}
          onCreate={openCreateDialog}
          notesFolder={notesFolderDraft}
          onNotesFolderChange={setNotesFolderDraft}
          error={error}
        />
        <CreateVaultDialog
          open={createVaultOpen}
          onClose={() => setCreateVaultOpen(false)}
          parentPath={parentPath}
          vaultName={vaultName}
          notesFolder={notesFolderDraft}
          error={error}
          onVaultNameChange={setVaultName}
          onNotesFolderChange={setNotesFolderDraft}
          onChooseParent={() => void chooseParent()}
          onSubmit={() => void submitCreateVault()}
        />
      </section>
    );
  }

  const linkCount = (draft?.taskIds.length ?? 0) + (draft?.dailyPlanIds.length ?? 0);

  return (
    <section className="project-notes-panel">
      <header className="project-notes-header">
        <div>
          <div className="title-md">项目笔记</div>
          <div className="body-sm muted project-notes-vault-label">
            <Icon name="auto_stories" size={16} /> {settings.vaultName ?? vaultNameFromPath(settings.rootPath)} · {notes.length} 篇
          </div>
        </div>
        <div className="project-notes-header-actions">
          <TextButton onClick={() => void refreshNotes()} disabled={loading}>
            <Icon name="refresh" size={17} slot="icon" /> 刷新
          </TextButton>
          <IconButton aria-label="笔记库设置" title="笔记库设置" onClick={openSettingsDialog}>
            <Icon name="settings" size={19} />
          </IconButton>
          <FilledButton onClick={() => {
            const newNote: ProjectNote = {
              id: uid("note_"),
              projectId: project.id,
              title: "新建笔记",
              relativePath: "",
              updatedAt: Date.now(),
              createdAt: Date.now(),
              pinned: false,
              taskIds: [],
              dailyPlanIds: [],
              contentHash: "",
              markdown: "# 新建笔记\n\n",
            };
            setNote(newNote);
            setDraft(draftFromNote(newNote));
            setSelectedPath("");
            setDirty(true);
            setError(null);
          }}>
            <Icon name="add" size={18} slot="icon" /> 新建笔记
          </FilledButton>
        </div>
      </header>

      {error && <div className="project-notes-error"><Icon name="error" size={18} /><span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="关闭错误提示">×</button></div>}

      <div className="project-notes-layout">
        <aside className="project-notes-list">
          <div className="project-notes-list-toolbar">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="搜索笔记..."
              className="project-notes-search-bar"
            />
          </div>
          {filteredNotes.length === 0 ? (
            <div className="project-notes-list-empty"><Icon name="note_add" size={28} /><span>{notes.length ? "没有匹配的笔记" : "还没有项目笔记"}</span><small>点击右上角新建第一篇</small></div>
          ) : (
            <div className="project-notes-list-items">
              {filteredNotes.map((item) => (
                <button
                  type="button"
                  className={`project-note-list-item ${item.relativePath === selectedPath ? "is-selected" : ""}`}
                  key={item.relativePath}
                  onClick={() => void selectNote(item)}
                >
                  <span className="project-note-list-item__icon"><Icon name={item.pinned ? "push_pin" : "description"} size={18} /></span>
                  <span className="project-note-list-item__body">
                    <span className="title-sm ellipsis">{item.title}</span>
                    <span className="body-sm muted ellipsis">{item.relativePath}</span>
                    <span className="body-sm muted">{noteDate(item.updatedAt)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="project-notes-editor">
          {loading ? <div className="project-notes-empty"><Icon name="progress_activity" size={28} /><span>正在读取笔记…</span></div> : !draft || !note ? (
            <div className="project-notes-empty"><Icon name="edit_note" size={34} /><span>选择一篇笔记开始编辑</span></div>
          ) : (
            <>
              <div className="project-notes-editor-toolbar">
                <div className="project-notes-save-state">
                  <span className={`project-notes-status-dot ${dirty ? "is-dirty" : ""}`} />
                  {saving ? "正在保存…" : dirty ? "未保存更改" : `已保存 · ${noteDate(note.updatedAt)}`}
                </div>
                <div className="project-notes-editor-actions">
                  <IconButton
                    aria-label={editorMode === "live" ? "切换为源码模式" : "切换为实时预览"}
                    title={editorMode === "live" ? "切换为源码模式" : "切换为实时预览"}
                    onClick={() => setEditorMode((m) => (m === "live" ? "source" : "live"))}
                  >
                    <Icon name={editorMode === "live" ? "visibility" : "code"} size={19} />
                  </IconButton>
                  <IconButton aria-label={draft.pinned ? "取消置顶" : "置顶笔记"} title={draft.pinned ? "取消置顶" : "置顶笔记"} onClick={() => updateDraft({ pinned: !draft.pinned })}>
                    <Icon name="push_pin" size={19} />
                  </IconButton>
                  <IconButton aria-label="关联任务和计划" title="关联任务和计划" onClick={() => setAssociationOpen(true)}>
                    <Icon name="link" size={19} />
                  </IconButton>
                  <IconButton aria-label="在 Obsidian 中打开" title="在 Obsidian 中打开" onClick={() => void openNoteInObsidian(settings, note.relativePath).catch((openError) => setError(errorMessage(openError)))}>
                    <Icon name="open_in_new" size={19} />
                  </IconButton>
                  <IconButton aria-label="删除笔记" title="删除笔记" onClick={() => setDeleteOpen(true)}>
                    <Icon name="delete" size={19} />
                  </IconButton>
                </div>
              </div>
              <input
                className="project-notes-title-input"
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                aria-label="笔记标题"
                placeholder="笔记标题"
              />
              <LiveMarkdownEditor
                value={draft.markdown}
                onChange={(markdown) => updateDraft({ markdown })}
                mode={editorMode}
                placeholder="输入 Markdown 笔记内容…（光标所在行自动展开源码）"
                className="project-notes-live-editor"
              />
              <div className="project-notes-editor-footer">
                <span className="body-sm muted">
                  {editorMode === "live" ? "实时预览模式 · " : "源码模式 · "}
                  Markdown · YAML Properties 自动维护
                </span>
                <button type="button" className="project-notes-link-summary" onClick={() => setAssociationOpen(true)}>
                  <Icon name="link" size={16} /> {linkCount ? `${linkCount} 个关联` : "未关联任务或计划"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <VaultSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        notesFolder={notesFolderDraft}
        autoReload={autoReloadDraft}
        openWithObsidian={openWithObsidianDraft}
        error={error}
        onNotesFolderChange={setNotesFolderDraft}
        onAutoReloadChange={setAutoReloadDraft}
        onOpenWithObsidianChange={setOpenWithObsidianDraft}
        onChooseExisting={() => void chooseExistingVault()}
        onCreate={openCreateDialog}
        onDisconnect={() => {
          applySettings({ enabled: false, rootPath: null, vaultName: null });
          setSettingsOpen(false);
          show("已断开 Vault");
        }}
        onSave={saveSettings}
      />
      <CreateVaultDialog
        open={createVaultOpen}
        onClose={() => setCreateVaultOpen(false)}
        parentPath={parentPath}
        vaultName={vaultName}
        notesFolder={notesFolderDraft}
        error={error}
        onVaultNameChange={setVaultName}
        onNotesFolderChange={setNotesFolderDraft}
        onChooseParent={() => void chooseParent()}
        onSubmit={() => void submitCreateVault()}
      />
      <AssociationDialog
        open={associationOpen}
        onClose={() => setAssociationOpen(false)}
        draft={draft}
        tasks={projectTasks}
        plans={projectPlans}
        onChange={updateDraft}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="删除项目笔记"
        message={`确定删除「${note?.title ?? "这篇笔记"}」吗？文件会从当前 Vault 中删除，此操作不可恢复。`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void deleteCurrentNote()}
      />
    </section>
  );
}

function VaultSetupDialog({
  open,
  onClose,
  onChooseExisting,
  onCreate,
  notesFolder,
  onNotesFolderChange,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onChooseExisting: () => void;
  onCreate: () => void;
  notesFolder: string;
  onNotesFolderChange: (value: string) => void;
  error: string | null;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="连接 Obsidian Vault" wide actions={<TextButton onClick={onClose}>关闭</TextButton>}>
      <p className="body-md muted">Markdown 正文保存在 Vault 文件中，项目、任务和计划关联写入 YAML frontmatter。不会修改 .obsidian 配置。</p>
      <div className="field">
        <OutlinedTextField label="笔记目录（相对 Vault 根目录）" value={notesFolder} onInput={(event) => onNotesFolderChange(eventValue(event))} placeholder="Task Orbit/Notes" />
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
      <div className="dialog__actions">
        <TextButton onClick={onChooseExisting}>选择现有 Vault</TextButton>
        <FilledButton onClick={onCreate}>新建 Vault</FilledButton>
      </div>
    </Dialog>
  );
}

function CreateVaultDialog({
  open,
  onClose,
  parentPath,
  vaultName,
  notesFolder,
  error,
  onVaultNameChange,
  onNotesFolderChange,
  onChooseParent,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  parentPath: string | null;
  vaultName: string;
  notesFolder: string;
  error: string | null;
  onVaultNameChange: (value: string) => void;
  onNotesFolderChange: (value: string) => void;
  onChooseParent: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="新建 Obsidian Vault" actions={<><TextButton onClick={onClose}>取消</TextButton><FilledButton onClick={onSubmit}>创建并连接</FilledButton></>}>
      <div className="field">
        <OutlinedTextField label="Vault 名称" value={vaultName} onInput={(event) => onVaultNameChange(eventValue(event))} placeholder="例如：Task Orbit Vault" autoFocus />
      </div>
      <div className="field">
        <div className="field__label">存放位置</div>
        <div className="project-notes-path-picker"><span className="body-sm muted ellipsis">{parentPath ?? "尚未选择文件夹"}</span><OutlinedButton onClick={onChooseParent}>选择位置</OutlinedButton></div>
      </div>
      <div className="field">
        <OutlinedTextField label="笔记目录" value={notesFolder} onInput={(event) => onNotesFolderChange(eventValue(event))} placeholder="Task Orbit/Notes" />
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
    </Dialog>
  );
}

function VaultSettingsDialog({
  open,
  onClose,
  settings,
  notesFolder,
  autoReload,
  openWithObsidian,
  error,
  onNotesFolderChange,
  onAutoReloadChange,
  onOpenWithObsidianChange,
  onChooseExisting,
  onCreate,
  onDisconnect,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: VaultSettings;
  notesFolder: string;
  autoReload: boolean;
  openWithObsidian: boolean;
  error: string | null;
  onNotesFolderChange: (value: string) => void;
  onAutoReloadChange: (value: boolean) => void;
  onOpenWithObsidianChange: (value: boolean) => void;
  onChooseExisting: () => void;
  onCreate: () => void;
  onDisconnect: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="笔记库设置" actions={<><TextButton onClick={onClose}>取消</TextButton><FilledButton onClick={onSave}>保存设置</FilledButton></>}>
      <div className="project-notes-settings-path">
        <div><div className="label-md">当前 Vault</div><div className="body-sm muted ellipsis">{settings.rootPath}</div></div>
        <div className="row gap-8"><OutlinedButton onClick={onChooseExisting}>更换</OutlinedButton><OutlinedButton onClick={onCreate}>新建</OutlinedButton></div>
      </div>
      <div className="field">
        <OutlinedTextField label="笔记目录（相对 Vault 根目录）" value={notesFolder} onInput={(event) => onNotesFolderChange(eventValue(event))} />
      </div>
      <div className="project-notes-setting-toggle">
        <span>
          <strong>自动检查外部变化</strong>
          <small>每 5 秒检查 Obsidian 中的更新</small>
        </span>
        <Switch
          selected={autoReload}
          onChange={(event) => onAutoReloadChange((event.target as HTMLInputElement & { selected: boolean }).selected)}
        />
      </div>
      <div className="project-notes-setting-toggle">
        <span>
          <strong>允许在 Obsidian 中打开</strong>
          <small>使用 obsidian:// URI 跳转到当前笔记</small>
        </span>
        <Switch
          selected={openWithObsidian}
          onChange={(event) => onOpenWithObsidianChange((event.target as HTMLInputElement & { selected: boolean }).selected)}
        />
      </div>
      {error && <p className="error-text body-sm">{error}</p>}
      <button type="button" className="project-notes-disconnect" onClick={onDisconnect}>断开当前 Vault</button>
    </Dialog>
  );
}

function AssociationDialog({
  open,
  onClose,
  draft,
  tasks,
  plans,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  draft: NoteDraft | null;
  tasks: Task[];
  plans: DailyPlan[];
  onChange: (patch: Partial<NoteDraft>) => void;
}) {
  if (!draft) return null;
  return (
    <Dialog open={open} onClose={onClose} title="关联任务和每日计划" wide actions={<FilledButton onClick={onClose}>完成</FilledButton>}>
      <p className="body-sm muted">关联会写入 YAML frontmatter，使用稳定 ID，不会因为项目改名而失效。</p>
      <div className="project-notes-association-grid">
        <div>
          <div className="label-md project-notes-association-heading">项目任务</div>
          {tasks.length === 0 ? <div className="body-sm muted">暂无项目任务</div> : tasks.map((task) => (
            <label className="project-notes-association-item" key={task.id}>
              <Checkbox checked={draft.taskIds.includes(task.id)} onChange={(event) => onChange({ taskIds: updateUniqueIds(draft.taskIds, task.id, (event.target as HTMLInputElement).checked) })} />
              <span>{task.name}</span>
            </label>
          ))}
          {draft.taskIds.filter((id) => !tasks.some((task) => task.id === id)).map((id) => <div className="project-notes-invalid-link" key={id}><Icon name="link_off" size={16} /> {targetLabel(id, "task", tasks, plans)}</div>)}
        </div>
        <div>
          <div className="label-md project-notes-association-heading">每日计划</div>
          {plans.length === 0 ? <div className="body-sm muted">暂无项目计划</div> : plans.map((plan) => (
            <label className="project-notes-association-item" key={plan.id}>
              <Checkbox checked={draft.dailyPlanIds.includes(plan.id)} onChange={(event) => onChange({ dailyPlanIds: updateUniqueIds(draft.dailyPlanIds, plan.id, (event.target as HTMLInputElement).checked) })} />
              <span><span>{plan.name}</span><small>{plan.date}</small></span>
            </label>
          ))}
          {draft.dailyPlanIds.filter((id) => !plans.some((plan) => plan.id === id)).map((id) => <div className="project-notes-invalid-link" key={id}><Icon name="link_off" size={16} /> {targetLabel(id, "plan", tasks, plans)}</div>)}
        </div>
      </div>
    </Dialog>
  );
}
