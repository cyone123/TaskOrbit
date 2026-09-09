import { useRef, useState } from "react";
import { todayISO, type WebDavSettings } from "@task-orbit/core";
import { useStore } from "../store/store";
import {
  CircularProgress,
  Divider,
  FilledButton,
  OutlinedButton,
  OutlinedTextField,
  PrimaryTab,
  Switch,
  Tabs,
  TextButton,
  TonalButton,
} from "./material";
import { ConfirmDialog, Dialog, useSnackbar } from "./ui";
import { Icon } from "./Icon";

export function DataManagementDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const store = useStore();
  const { show } = useSnackbar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [pendingImport, setPendingImport] = useState<{ name: string; raw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // WebDAV local draft settings state
  const webDav = store.state.webDavSettings;
  const [serverUrl, setServerUrl] = useState(webDav.serverUrl);
  const [username, setUsername] = useState(webDav.username);
  const [password, setPassword] = useState(webDav.password);
  const [remoteDir, setRemoteDir] = useState(webDav.remoteDir);
  const [enabled, setEnabled] = useState(webDav.enabled);
  const [autoSync, setAutoSync] = useState(webDav.autoSync);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Sync draft when opened or state changes
  const lastStateWebDav = useRef(webDav);
  if (lastStateWebDav.current !== webDav) {
    lastStateWebDav.current = webDav;
    setServerUrl(webDav.serverUrl);
    setUsername(webDav.username);
    setPassword(webDav.password);
    setRemoteDir(webDav.remoteDir);
    setEnabled(webDav.enabled);
    setAutoSync(webDav.autoSync);
  }

  const closeDialog = () => {
    setPendingImport(null);
    setError(null);
    setTestResult(null);
    onClose();
  };

  const exportData = () => {
    const blob = new Blob([store.exportSnapshot()], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `task-orbit-backup-${todayISO()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    show("数据已导出");
  };

  const chooseImportFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      setPendingImport({ name: file.name, raw: await file.text() });
    } catch (readError) {
      setError(`无法读取文件：${readError instanceof Error ? readError.message : String(readError)}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = () => {
    const pending = pendingImport;
    if (!pending) return;
    setPendingImport(null);
    void store.importSnapshot(pending.raw).then(
      () => {
        show("数据已导入，当前计时器已清空");
        closeDialog();
      },
      (importError) => {
        setError(importError instanceof Error ? importError.message : String(importError));
      },
    );
  };

  const saveWebDavConfig = (overrides: Partial<WebDavSettings> = {}) => {
    const patch: Partial<WebDavSettings> = {
      serverUrl,
      username,
      password,
      remoteDir,
      enabled,
      autoSync,
      ...overrides,
    };
    store.updateWebDavSettings(patch);
    show("WebDAV 配置已保存");
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await store.testWebDavConnection({
        ...webDav,
        serverUrl,
        username,
        password,
        remoteDir,
        enabled,
        autoSync,
      });
      setTestResult(res);
      if (res.success) {
        show("WebDAV 连接测试成功！");
      }
    } catch (e) {
      setTestResult({
        success: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncNow = async () => {
    // Auto-save changes first
    saveWebDavConfig();
    setSyncing(true);
    try {
      const res = await store.syncNow();
      if (res.success) {
        show(res.hasChanges ? "同步成功，数据已合并更新" : "数据已是最新状态");
      } else {
        show(`同步未完成：${res.message ?? "未知错误"}`);
      }
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSyncTime = (timestamp: number | null) => {
    if (!timestamp) return "从未同步";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (diffMin < 1) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={closeDialog}
        title="数据管理与同步"
        actions={<TextButton onClick={onClose}>关闭</TextButton>}
      >
        <div className="col gap-12" style={{ minWidth: 460 }}>
          <Tabs
            activeTabIndex={activeTab}
            onChange={(e) => setActiveTab((e.target as unknown as { activeTabIndex: number }).activeTabIndex)}
          >
            <PrimaryTab>WebDAV 云同步</PrimaryTab>
            <PrimaryTab>本地快照备份</PrimaryTab>
          </Tabs>

          {activeTab === 0 && (
            <div className="col gap-12 mt-8">
              <div className="row items-center justify-between">
                <div>
                  <div className="title-sm">启用 WebDAV 同步</div>
                  <div className="body-xs muted">通过自建或公共 WebDAV 服务器跨设备自动对账</div>
                </div>
                <Switch
                  selected={enabled}
                  onChange={(e) => {
                    const next = (e.target as unknown as { selected: boolean }).selected;
                    setEnabled(next);
                    saveWebDavConfig({ enabled: next });
                  }}
                />
              </div>

              <Divider />

              <div className="col gap-8">
                <OutlinedTextField
                  label="服务器地址"
                  placeholder="https://dav.example.com/webdav/"
                  value={serverUrl}
                  onInput={(e) => setServerUrl((e.target as HTMLInputElement).value)}
                  onBlur={() => saveWebDavConfig()}
                />
                <div className="row gap-8">
                  <OutlinedTextField
                    label="用户名"
                    value={username}
                    style={{ flex: 1 }}
                    onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
                    onBlur={() => saveWebDavConfig()}
                  />
                  <OutlinedTextField
                    label="密码 / 授权码"
                    type="password"
                    value={password}
                    style={{ flex: 1 }}
                    onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                    onBlur={() => saveWebDavConfig()}
                  />
                </div>
                <OutlinedTextField
                  label="云端工作目录"
                  placeholder="/taskorbit"
                  value={remoteDir}
                  onInput={(e) => setRemoteDir((e.target as HTMLInputElement).value)}
                  onBlur={() => saveWebDavConfig()}
                />
              </div>

              <div className="row items-center justify-between">
                <div>
                  <div className="body-sm">自动同步</div>
                  <div className="body-xs muted">应用启动时拉取最新状态，本地修改后静默推送</div>
                </div>
                <Switch
                  selected={autoSync}
                  onChange={(e) => {
                    const next = (e.target as unknown as { selected: boolean }).selected;
                    setAutoSync(next);
                    saveWebDavConfig({ autoSync: next });
                  }}
                />
              </div>

              {testResult && (
                <div
                  className={`app-notice ${testResult.success ? "app-notice--info" : "app-notice--error"}`}
                  style={{ position: "relative", top: 0, padding: 8, borderRadius: 8 }}
                >
                  {testResult.success ? (
                    <Icon name="check_circle" size={16} style={{ color: "var(--md-primary)" }} />
                  ) : (
                    <Icon name="error" size={16} style={{ color: "var(--md-error)" }} />
                  )}
                  <span className="body-xs">{testResult.message}</span>
                </div>
              )}

              {store.syncErrorMessage && (
                <div className="error-text body-xs">同步异常：{store.syncErrorMessage}</div>
              )}

              <div className="row items-center justify-between mt-4">
                <div className="body-xs muted">
                  上次同步：{formatLastSyncTime(store.lastSyncAt)}
                  {store.syncStatus === "syncing" && " (正在同步...)"}
                </div>
                <div className="row gap-8">
                  <OutlinedButton onClick={handleTestConnection} disabled={testing || syncing}>
                    {testing ? (
                      <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
                    ) : (
                      <Icon name="network_check" size={18} slot="icon" />
                    )}
                    测试连接
                  </OutlinedButton>
                  <FilledButton onClick={handleSyncNow} disabled={syncing || testing || !serverUrl.trim()}>
                    {syncing ? (
                      <CircularProgress indeterminate style={{ width: 16, height: 16 }} slot="icon" />
                    ) : (
                      <Icon name="sync" size={18} slot="icon" />
                    )}
                    立即同步
                  </FilledButton>
                </div>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="col gap-12 mt-8">
              <div className="body-md">
                导出完整工作区快照，用于离线归档或手动迁移。敏感信息（如 WebDAV 密码）已自动脱敏保护。
              </div>
              <div className="row gap-8">
                <TonalButton onClick={exportData}>
                  <Icon name="download" size={18} slot="icon" /> 导出 JSON
                </TonalButton>
                <OutlinedButton onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" size={18} slot="icon" /> 导入 JSON
                </OutlinedButton>
              </div>
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept=".json,application/json"
                onChange={(event) => void chooseImportFile(event.target.files?.[0])}
              />
              <div className="body-sm muted">
                导入会校验并迁移数据，然后整体替换当前工作区。替换前会先保存当前数据作为备份。
              </div>
              {error && <div className="error-text body-sm">{error}</div>}
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        open={pendingImport !== null}
        title="确认导入数据"
        message={`将导入「${pendingImport?.name ?? "快照文件"}」，当前工作区会被整体替换，正在运行的番茄钟会被清空。是否继续？`}
        confirmLabel="导入并替换"
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmImport}
      />
    </>
  );
}
