import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import { FilledButton, MaterialDialog, TextButton } from "./material";

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
}

export function Dialog({ open, onClose, title, children, actions, wide }: DialogProps) {
  if (!open) return null;

  return createPortal(
    <MaterialDialog
      open={open}
      className={`material-dialog ${wide ? "material-dialog--wide" : ""}`}
      onCancel={onClose}
    >
      <div slot="headline">{title}</div>
      <div slot="content" className="material-dialog__content">
        {children}
      </div>
      {actions && <div slot="actions">{actions}</div>}
    </MaterialDialog>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Confirm dialog                                                             */
/* -------------------------------------------------------------------------- */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "删除",
  danger = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <TextButton onClick={onCancel}>
            取消
          </TextButton>
          <FilledButton
            className={danger ? "material-button--danger" : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </FilledButton>
        </>
      }
    >
      <p className="body-md">{message}</p>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Snackbar                                                                   */
/* -------------------------------------------------------------------------- */

const SnackbarContext = createContext<{ show: (msg: string) => void }>({
  show: () => {},
});

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((message: string) => {
    setMsg(message);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      {msg &&
        createPortal(
          <div className="snackbar">
            <Icon name="check_circle" size={20} />
            <span className="body-md">{msg}</span>
          </div>,
          document.body,
        )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar() {
  return useContext(SnackbarContext);
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <div className="empty">
      <Icon name={icon} size={48} />
      <div className="title-md">{title}</div>
      {hint && <div className="body-sm muted mt-8">{hint}</div>}
    </div>
  );
}
