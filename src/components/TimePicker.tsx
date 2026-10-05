import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { OutlinedTextField, TextButton, eventValue } from "./material";

export interface TimePickerProps {
  label: string;
  value: string; // HH:MM
  onChange: (value: string) => void;
  min?: string; // HH:MM
  max?: string; // HH:MM
  align?: "left" | "right" | "auto";
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const PRESET_TIMES = ["09:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

export function TimePicker({
  label,
  value,
  onChange,
  min,
  max,
  align = "auto",
  disabled = false,
  required = false,
  className = "",
  placeholder = "HH:MM",
}: TimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(value);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  // Sync internal typed value when prop changes
  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  const [currentHour, currentMinute] = (() => {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      const [h, m] = value.split(":");
      return [h, m];
    }
    return ["09", "00"];
  })();

  // Calculate fixed viewport positioning so dialog overflow:hidden never clips the popover
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 290;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 410;

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

  // Auto-scroll selected hour & minute into view when opening without shifting parent containers
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const selectedHourEl = hourListRef.current?.querySelector(".selected") as HTMLElement | null;
        if (selectedHourEl && hourListRef.current) {
          hourListRef.current.scrollTop =
            selectedHourEl.offsetTop -
            hourListRef.current.clientHeight / 2 +
            selectedHourEl.clientHeight / 2;
        }
        const selectedMinEl = minuteListRef.current?.querySelector(".selected") as HTMLElement | null;
        if (selectedMinEl && minuteListRef.current) {
          minuteListRef.current.scrollTop =
            selectedMinEl.offsetTop -
            minuteListRef.current.clientHeight / 2 +
            selectedMinEl.clientHeight / 2;
        }
      });
    }
  }, [open]);

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

  const isHourDisabled = (h: string) => {
    const hourNum = parseInt(h, 10);
    if (min) {
      const minHour = parseInt(min.split(":")[0], 10);
      if (hourNum < minHour) return true;
    }
    if (max) {
      const maxHour = parseInt(max.split(":")[0], 10);
      if (hourNum > maxHour) return true;
    }
    return false;
  };

  const isMinuteDisabled = (m: string) => {
    const minNum = parseInt(m, 10);
    const hourNum = parseInt(currentHour, 10);
    if (min) {
      const [minH, minM] = min.split(":").map(Number);
      if (hourNum < minH) return true;
      if (hourNum === minH && minNum < minM) return true;
    }
    if (max) {
      const [maxH, maxM] = max.split(":").map(Number);
      if (hourNum > maxH) return true;
      if (hourNum === maxH && minNum > maxM) return true;
    }
    return false;
  };

  const handleSelectHour = (h: string) => {
    if (isHourDisabled(h)) return;
    const newTime = `${h}:${currentMinute}`;
    onChange(newTime);
    setTypedValue(newTime);
  };

  const handleSelectMinute = (m: string) => {
    if (isMinuteDisabled(m)) return;
    const newTime = `${currentHour}:${m}`;
    onChange(newTime);
    setTypedValue(newTime);
    setOpen(false);
  };

  const handleSelectPreset = (time: string) => {
    onChange(time);
    setTypedValue(time);
    setOpen(false);
  };

  const handleSelectCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(Math.round(now.getMinutes() / 5) * 5 % 60).padStart(2, "0");
    const formatted = `${h}:${m}`;
    onChange(formatted);
    setTypedValue(formatted);
    setOpen(false);
  };

  const handleManualInput = (val: string) => {
    setTypedValue(val);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
      if ((!min || val >= min) && (!max || val <= max)) {
        onChange(val);
      }
    }
  };

  const handleInputBlur = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(typedValue)) {
      setTypedValue(value);
    }
  };

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
          title={open ? "关闭时间选择" : "打开时间选择"}
          aria-label={open ? "关闭时间选择" : "打开时间选择"}
        >
          <Icon name="schedule" size={18} />
        </span>
      </OutlinedTextField>

      {open && (
        <div
          ref={popoverRef}
          className={`md3-picker-popover md3-time-popover ${align === "right" ? "align-right" : ""}`}
          style={popoverStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick preset chips */}
          <div className="md3-picker-presets">
            {PRESET_TIMES.map((time) => {
              const disabled = Boolean(
                (min && time < min) || (max && time > max),
              );
              return (
                <button
                  key={time}
                  type="button"
                  className="md3-picker-chip"
                  onClick={() => handleSelectPreset(time)}
                  disabled={disabled}
                >
                  {time}
                </button>
              );
            })}
          </div>

          {/* Time digits display */}
          <div className="md3-time-header">
            <div className="md3-time-digit-box active">
              <span className="md3-time-digit-val">{currentHour}</span>
              <span className="md3-time-digit-lbl">时</span>
            </div>
            <span className="md3-time-colon">:</span>
            <div className="md3-time-digit-box active">
              <span className="md3-time-digit-val">{currentMinute}</span>
              <span className="md3-time-digit-lbl">分</span>
            </div>
          </div>

          {/* Dual columns for Hour and Minute */}
          <div className="md3-time-cols">
            <div className="md3-time-col" ref={hourListRef}>
              <div className="md3-time-col-header">小时</div>
              {HOURS.map((h) => {
                const isSelected = h === currentHour;
                const disabled = isHourDisabled(h);
                let optClass = "md3-time-option";
                if (isSelected) optClass += " selected";
                if (disabled) optClass += " disabled";

                return (
                  <button
                    key={h}
                    type="button"
                    className={optClass}
                    onClick={() => handleSelectHour(h)}
                    disabled={disabled}
                  >
                    {h}
                  </button>
                );
              })}
            </div>

            <div className="md3-time-col" ref={minuteListRef}>
              <div className="md3-time-col-header">分钟</div>
              {MINUTES.map((m) => {
                const isSelected = m === currentMinute;
                const disabled = isMinuteDisabled(m);
                let optClass = "md3-time-option";
                if (isSelected) optClass += " selected";
                if (disabled) optClass += " disabled";

                return (
                  <button
                    key={m}
                    type="button"
                    className={optClass}
                    onClick={() => handleSelectMinute(m)}
                    disabled={disabled}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="md3-time-footer">
            <TextButton type="button" onClick={handleSelectCurrentTime}>
              当前时间
            </TextButton>
            <TextButton type="button" onClick={() => setOpen(false)}>
              确定
            </TextButton>
          </div>
        </div>
      )}
    </div>
  );
}
