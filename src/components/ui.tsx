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
import {
  FilledButton,
  IconButton,
  MaterialDialog,
  Ripple,
  TextButton,
} from "./material";

/* -------------------------------------------------------------------------- */
/* Extended FAB                                                               */
/* -------------------------------------------------------------------------- */

export interface ExtendedFabProps {
  label: string;
  icon?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "surface";
  lowered?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  type?: "button" | "submit" | "reset";
  children?: ReactNode;
}

export function ExtendedFab({
  label,
  icon,
  onClick,
  variant = "primary",
  lowered = false,
  disabled = false,
  className = "",
  style,
  title,
  type = "button",
  children,
}: ExtendedFabProps) {
  return (
    <button
      type={type}
      className={`extended-fab extended-fab--${variant} ${lowered ? "extended-fab--lowered" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title || label}
      aria-label={label}
    >
      {icon && (
        <span className="extended-fab__icon">
          <Icon name={icon} size={24} />
        </span>
      )}
      <span className="extended-fab__label">{label}</span>
      {children}
      <Ripple />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Search Bar                                                                 */
/* -------------------------------------------------------------------------- */

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  leadingIcon?: string;
  trailingActions?: ReactNode;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
}

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "搜索...",
  leadingIcon = "search",
  trailingActions,
  className = "",
  disabled = false,
  autoFocus = false,
  "aria-label": ariaLabel,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      className={`search-bar ${disabled ? "search-bar--disabled" : ""} ${className}`}
      role="search"
    >
      {leadingIcon && (
        <span className="search-bar__leading-icon">
          <Icon name={leadingIcon} size={20} />
        </span>
      )}
      <input
        ref={inputRef}
        type="text"
        className="search-bar__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel || placeholder}
      />
      <div className="search-bar__trailing">
        {value && !disabled && (
          <IconButton
            onClick={handleClear}
            aria-label="清空搜索"
            title="清空搜索"
          >
            <Icon name="close" size={18} />
          </IconButton>
        )}
        {trailingActions}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* StatCard (MD3 Tonal KPI Metric Card)                                       */
/* -------------------------------------------------------------------------- */

export interface StatCardProps {
  title: string;
  value: ReactNode;
  unit?: string;
  subtitle?: ReactNode;
  icon?: string;
  colorVariant?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "info";
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  trailing?: ReactNode;
}

export function StatCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  colorVariant,
  onClick,
  className = "",
  style,
  trailing,
}: StatCardProps) {
  const interactive = typeof onClick === "function";
  const variantClass = colorVariant ? `stat-card--${colorVariant}` : "";

  return (
    <div
      className={`stat-card ${variantClass} ${interactive ? "stat-card--interactive" : ""} ${className}`}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={style}
    >
      <div className="stat-card__header">
        {icon && (
          <div className="stat-card__icon-box">
            <Icon name={icon} size={22} />
          </div>
        )}
        <span className="stat-card__title">{title}</span>
        <div className="ml-auto" />
        {trailing}
      </div>
      <div className="stat-card__value-row">
        <span className="stat-card__value">{value}</span>
        {unit && <span className="stat-card__unit">{unit}</span>}
      </div>
      {subtitle && <div className="stat-card__subtitle">{subtitle}</div>}
      {interactive && <Ripple />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

export interface BadgeProps {
  value?: string | number;
  dot?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "error" | "neutral" | "success" | "warning" | "info";
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
}

export function Badge({
  value,
  dot = false,
  variant = "error",
  className = "",
  style,
  children,
}: BadgeProps) {
  const badgeElement = (
    <span
      className={`badge ${dot ? "badge--dot" : "badge--pill"} badge--${variant} ${className}`}
      style={style}
    >
      {!dot && value !== undefined && value}
    </span>
  );

  if (children) {
    return (
      <span className="badge-anchor">
        {children}
        {badgeElement}
      </span>
    );
  }

  return badgeElement;
}

/* -------------------------------------------------------------------------- */
/* Section Header                                                             */
/* -------------------------------------------------------------------------- */

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  actions,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`section-header ${className}`}>
      <div className="section-header__title-group">
        <h2 className="section-header__title">{title}</h2>
        {badge}
        {subtitle && <span className="section-header__subtitle">{subtitle}</span>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  icon?: string;
  wide?: boolean;
}

export function Dialog({ open, onClose, title, children, actions, icon, wide }: DialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="dialog-layer">
      <MaterialDialog
        open={open}
        className={`material-dialog ${wide ? "material-dialog--wide" : ""}`}
        onCancel={onClose}
      >
        {icon && <Icon slot="icon" name={icon} size={24} />}
        <div slot="headline">{title}</div>
        <div slot="content" className="material-dialog__content">
          {children}
        </div>
        {actions && <div slot="actions">{actions}</div>}
      </MaterialDialog>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */
/* Confirm dialog                                                             */
/* -------------------------------------------------------------------------- */

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "删除",
  danger = true,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      icon={icon || (danger ? "warning" : undefined)}
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

export interface SnackbarOptions {
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
  type?: "info" | "success" | "error" | "warning";
}

interface SnackbarItem {
  id: number;
  message: string;
  options?: SnackbarOptions;
}

interface SnackbarContextValue {
  show: (message: string, options?: SnackbarOptions) => void;
}

const SnackbarContext = createContext<SnackbarContextValue>({
  show: () => {},
});

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarItem | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const idCounter = useRef(0);

  const show = useCallback((message: string, options?: SnackbarOptions) => {
    const id = ++idCounter.current;
    setCurrent({ id, message, options });
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const duration = options?.duration ?? 3000;
    timerRef.current = window.setTimeout(() => {
      setCurrent((prev) => (prev?.id === id ? null : prev));
    }, duration);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const defaultIcon = (type?: string) => {
    switch (type) {
      case "error":
        return "error";
      case "warning":
        return "warning";
      case "info":
        return "info";
      default:
        return "check_circle";
    }
  };

  return (
    <SnackbarContext.Provider value={{ show }}>
      {children}
      {current &&
        createPortal(
          <div className="snackbar" key={current.id}>
            <span className="snackbar__icon">
              <Icon
                name={current.options?.icon || defaultIcon(current.options?.type)}
                size={20}
              />
            </span>
            <span className="snackbar__message body-md">{current.message}</span>
            {current.options?.actionLabel && (
              <button
                type="button"
                className="snackbar__action"
                onClick={() => {
                  current.options?.onAction?.();
                  setCurrent(null);
                }}
              >
                {current.options.actionLabel}
              </button>
            )}
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

export interface EmptyStateProps {
  icon: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, hint, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`empty ${className}`}>
      <Icon name={icon} size={48} />
      <div className="title-md">{title}</div>
      {hint && <div className="body-sm muted mt-8">{hint}</div>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}
