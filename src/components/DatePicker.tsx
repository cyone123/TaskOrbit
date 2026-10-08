import { useEffect, useRef, useState } from "react";
import {
  addDays,
  isToday as checkIsToday,
  parseISODate,
  todayISO,
  toISODate,
} from "@task-orbit/core";
import { Icon } from "./Icon";
import { OutlinedTextField, TextButton, eventValue } from "./material";

export interface DatePickerProps {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  align?: "left" | "right" | "auto";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  align = "auto",
  disabled = false,
  required = false,
  className = "",
  placeholder = "YYYY-MM-DD",
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Sync internal typed value when prop changes
  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  // Current calendar month view (0-indexed month)
  const initialDate = value ? parseISODate(value) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Update calendar view when opened or value changes
  useEffect(() => {
    if (value) {
      const d = parseISODate(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, open]);

  // Calculate fixed viewport positioning so dialog overflow:hidden never clips the popover
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 312;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 440;

    let left = rect.left;
    if (align === "right" || left + popoverWidth > window.innerWidth - 16) {
      left = rect.right - popoverWidth;
    }
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    let top: number;

    if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6;
    } else {
      top = rect.top - popoverHeight - 6;
    }

    if (top < 12) {
      top = 12;
    }
    if (top + popoverHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - popoverHeight - 12);
    }

    setPopoverStyle({
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
    });
  };

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setOpen(true);
  };

  // Close on outside click & track scrolling/resizing
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);

    const handleScrollOrResize = () => {
      updatePosition();
    };

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, align]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDate = (iso: string) => {
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setTypedValue(iso);
    setOpen(false);
  };

  const handleManualInput = (val: string) => {
    setTypedValue(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const d = parseISODate(val);
      if (!isNaN(d.getTime())) {
        if ((!min || val >= min) && (!max || val <= max)) {
          onChange(val);
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }
  };

  const handleInputBlur = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(typedValue)) {
      setTypedValue(value);
    }
  };

  // Quick preset dates
  const today = todayISO();
  const tomorrow = toISODate(addDays(new Date(), 1));
  const thisWeekend = (() => {
    const d = new Date();
    const day = d.getDay(); // 0 is Sun, 6 is Sat
    const diff = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
    return toISODate(addDays(d, diff));
  })();
  const nextWeek = toISODate(addDays(new Date(), 7));

  // Build 35 or 42 grid cells for the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // 0 is Mon
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { iso: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(viewYear, viewMonth - 1, day);
    cells.push({ iso: toISODate(d), dayNumber: day, isCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    cells.push({ iso: toISODate(d), dayNumber: day, isCurrentMonth: true });
  }

  const totalSoFar = cells.length;
  const remaining = totalSoFar <= 35 ? 35 - totalSoFar : 42 - totalSoFar;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(viewYear, viewMonth + 1, day);
    cells.push({ iso: toISODate(d), dayNumber: day, isCurrentMonth: false });
  }

  return (
    <div
      ref={containerRef}
      className={`md3-picker-container ${className}`}
      onKeyDown={handleKeyDown}
    >
      <OutlinedTextField
        label={label}
        aria-label={label}
        value={typedValue}
        onInput={(e) => handleManualInput(eventValue(e))}
        onBlur={handleInputBlur}
        onClick={handleOpen}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={{ width: "100%" }}
      >
        <span
          slot="trailing-icon"
          className="md3-picker-trailing-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              if (!open) updatePosition();
              setOpen((prev) => !prev);
            }
          }}
          title={open ? "关闭日历" : "打开日历"}
          aria-label={open ? "关闭日历" : "打开日历"}
        >
          <Icon name="calendar_today" size={18} />
        </span>
      </OutlinedTextField>

      {open && (
        <div
          ref={popoverRef}
          className={`md3-picker-popover ${align === "right" ? "align-right" : ""}`}
          style={popoverStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick preset chips */}
          <div className="md3-picker-presets">
            <button
              type="button"
              className="md3-picker-chip"
              onClick={() => handleSelectDate(today)}
            >
              今天
            </button>
            <button
              type="button"
              className="md3-picker-chip"
              onClick={() => handleSelectDate(tomorrow)}
            >
              明天
            </button>
            <button
              type="button"
              className="md3-picker-chip"
              onClick={() => handleSelectDate(thisWeekend)}
            >
              本周末
            </button>
            <button
              type="button"
              className="md3-picker-chip"
              onClick={() => handleSelectDate(nextWeek)}
            >
              +7天
            </button>
          </div>

          {/* Month & Year header */}
          <div className="md3-date-header">
            <button
              type="button"
              className="md3-picker-icon-btn"
              onClick={prevMonth}
              title="上个月"
              aria-label="上个月"
            >
              <Icon name="chevron_left" size={20} />
            </button>
            <span className="md3-date-header__title">
              {viewYear}年 {viewMonth + 1}月
            </span>
            <button
              type="button"
              className="md3-picker-icon-btn"
              onClick={nextMonth}
              title="下个月"
              aria-label="下个月"
            >
              <Icon name="chevron_right" size={20} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="md3-date-weekdays">
            {WEEKDAYS.map((w) => (
              <div key={w} className="md3-date-weekday">
                {w}
              </div>
            ))}
          </div>

          {/* Month days grid */}
          <div className="md3-date-grid">
            {cells.map(({ iso, dayNumber, isCurrentMonth }) => {
              const isSelected = iso === value;
              const isTodayDate = checkIsToday(iso);
              const isDisabled = Boolean(
                (min && iso < min) || (max && iso > max),
              );

              let cellClass = "md3-date-cell";
              if (isSelected) cellClass += " selected";
              if (isTodayDate) cellClass += " today";
              if (!isCurrentMonth) cellClass += " outside";
              if (isDisabled) cellClass += " disabled";

              return (
                <button
                  key={iso}
                  type="button"
                  className={cellClass}
                  onClick={() => handleSelectDate(iso)}
                  disabled={isDisabled}
                  title={iso}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="md3-date-footer">
            <TextButton type="button" onClick={() => handleSelectDate(today)}>
              选今天
            </TextButton>
            <TextButton type="button" onClick={() => setOpen(false)}>
              关闭
            </TextButton>
          </div>
        </div>
      )}
    </div>
  );
}
