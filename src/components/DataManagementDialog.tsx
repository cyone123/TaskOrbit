import { useRef, useState } from "react";
import { todayISO } from "@task-orbit/core";
import { useStore } from "../store/store";
import { OutlinedButton, TextButton, TonalButton } from "./material";
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
  const [pendingImport, setPendingImport] = useState<{ name: string; raw: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const closeDialog = () => {
    setPendingImport(null);
    setError(null);
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

  return (
    <>
      <Dialog
        open={open}
        onClose={closeDialog}
        title="数据管理"
        actions={
          <TextButton onClick={onClose}>关闭</TextButton>
        }
      >
        <div className="col gap-12">
          <div className="body-md">
            导出完整工作区快照，用于备份或迁移到另一台设备。导出文件不包含正在运行的番茄钟。
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
            导入会校验并迁移数据，然后整体替换当前工作区，不会合并两个文件。替换前会先保存当前数据作为备份。
          </div>
          {error && <div className="error-text body-sm">{error}</div>}
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
