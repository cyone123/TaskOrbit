import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { OutlinedTextField, TonalButton, eventValue } from "./material";
import {
  PROJECT_COLORS,
  colorByKey,
  contrastText,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from "../store/colors";

export interface ColorPickerProps {
  value: string; // Preset key or hex color code
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

const QUICK_SWATCHES = [
  "#EF4444", "#F97316", "#F59E0B", "#10B981", "#14B8A6", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#64748B", "#1E293B",
];

export function ColorPicker({
  value,
  onChange,
  label = "颜色",
  className = "",
}: ColorPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});

  const isCustomColor = !PROJECT_COLORS.some((c) => c.key === value);
  const activeCustomHex = normalizeHex(isCustomColor ? value : colorByKey(value));

  // Internal HSV states for custom color adjustment
  const initialHsv = hexToHsv(activeCustomHex);
  const [hue, setHue] = useState(initialHsv.h);
  const [saturation, setSaturation] = useState(initialHsv.s);
  const [val, setVal] = useState(initialHsv.v);
  const [hexInput, setHexInput] = useState(activeCustomHex.replace("#", "").toUpperCase());

  // Sync HSV and hex input whenever external custom value changes
  useEffect(() => {
    if (isCustomColor) {
      const hsv = hexToHsv(value);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setVal(hsv.v);
      setHexInput(normalizeHex(value).replace("#", "").toUpperCase());
    }
  }, [value, isCustomColor]);

  // Position the floating MD3 popover fixed in viewport
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 288;
    const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : 380;

    let left = rect.left;
    if (left + popoverWidth > window.innerWidth - 16) {
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
      top = rect.bottom + 8;
    } else {
      top = rect.top - popoverHeight - 8;
    }

    if (top < 12) top = 12;
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
    if (!isCustomColor) {
      // Activate custom color from current preset
      onChange(activeCustomHex);
    }
    updatePosition();
    setOpen(true);
  };

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      handleOpen();
    }
  };

  // Close on outside click, Escape, and track scrolling/resizing
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
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  // 2D Saturation / Value Canvas Pointer Dragging
  const updateCanvasFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    const s = x / rect.width;
    const v = 1 - y / rect.height;
    setSaturation(s);
    setVal(v);
    const hex = hsvToHex(hue, s, v);
    setHexInput(hex.replace("#", "").toUpperCase());
    onChange(hex);
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateCanvasFromPointer(e);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateCanvasFromPointer(e);
  };

  // Hue Slider Pointer Dragging
  const updateHueFromPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const h = (x / rect.width) * 360;
    setHue(h);
    const hex = hsvToHex(h, saturation, val);
    setHexInput(hex.replace("#", "").toUpperCase());
    onChange(hex);
  };

  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    updateHueFromPointer(e);
  };

  const handleHuePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    updateHueFromPointer(e);
  };

  // Hex Text Field Input
  const handleHexInputChange = (event: Event) => {
    const raw = eventValue(event).replace(/[^0-9a-fA-F]/g, "").slice(0, 6).toUpperCase();
    setHexInput(raw);
    if (raw.length === 6 || raw.length === 3) {
      const normalized = normalizeHex(`#${raw}`);
      const hsv = hexToHsv(normalized);
      setHue(hsv.h);
      setSaturation(hsv.s);
      setVal(hsv.v);
      onChange(normalized);
    }
  };

  const activePreset = PROJECT_COLORS.find((c) => c.key === value);

  return (
    <div className={`color-picker-component ${className}`}>
      {/* Label Row */}
      <div className="spread" style={{ marginBottom: 8 }}>
        <label className="field__label">{label}</label>
        {isCustomColor ? (
          <span
            className="label-sm muted"
            style={{ fontFamily: "monospace", letterSpacing: "0.5px" }}
            title={`当前自定义颜色: ${activeCustomHex.toUpperCase()}`}
          >
            {activeCustomHex.toUpperCase()}
          </span>
        ) : (
          <span className="label-sm muted">{activePreset?.name}</span>
        )}
      </div>

      {/* Preset Swatches & Custom Palette Button */}
      <div className="row row--wrap gap-8" style={{ alignItems: "center" }}>
        {PROJECT_COLORS.map((c) => {
          const isSelected = value === c.key;
          return (
            <button
              key={c.key}
              type="button"
              className={`color-dot ${isSelected ? "selected" : ""}`}
              style={{ background: c.hex }}
              onClick={() => {
                onChange(c.key);
                setOpen(false);
              }}
              title={c.name}
              aria-label={c.name}
            >
              {isSelected && (
                <Icon
                  name="check"
                  size={16}
                  style={{ color: contrastText(c.hex) }}
                />
              )}
            </button>
          );
        })}

        {/* Custom Palette Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          className={`color-dot color-dot--custom ${isCustomColor ? "selected" : ""}`}
          style={{
            background: isCustomColor ? activeCustomHex : "var(--md-surface-container-high)",
          }}
          onClick={handleToggle}
          title={isCustomColor ? `自定义颜色 (${activeCustomHex.toUpperCase()})` : "自定义颜色（调色盘）"}
          aria-label={isCustomColor ? `自定义颜色 (${activeCustomHex.toUpperCase()})` : "自定义颜色（调色盘）"}
        >
          <Icon
            name="palette"
            size={16}
            style={{
              color: isCustomColor ? contrastText(activeCustomHex) : "inherit",
            }}
          />
        </button>

        {/* Hidden input for DOM backward-compatibility and tests */}
        <input
          type="color"
          value={activeCustomHex}
          readOnly
          style={{ position: "absolute", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Floating Material Design 3 Color Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="md3-color-popover"
          style={popoverStyle}
        >
          {/* 2D Saturation / Value Gradient Canvas */}
          <div
            className="md3-color-canvas"
            style={{
              backgroundColor: `hsl(${Math.round(hue)}, 100%, 50%)`,
              backgroundImage:
                "linear-gradient(to top, #000000, transparent), linear-gradient(to right, #ffffff, transparent)",
            }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
          >
            <div
              className="md3-color-canvas__thumb"
              style={{
                left: `${Math.round(saturation * 100)}%`,
                top: `${Math.round((1 - val) * 100)}%`,
                backgroundColor: activeCustomHex,
              }}
            />
          </div>

          {/* Hue Rainbow Slider */}
          <div
            className="md3-color-slider"
            onPointerDown={handleHuePointerDown}
            onPointerMove={handleHuePointerMove}
          >
            <div
              className="md3-color-slider__thumb"
              style={{
                left: `${Math.round((hue / 360) * 100)}%`,
                backgroundColor: `hsl(${Math.round(hue)}, 100%, 50%)`,
              }}
            />
          </div>

          {/* Color Preview & HEX Code Input */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="md3-color-preview-box"
              style={{ backgroundColor: activeCustomHex }}
            >
              <Icon
                name="palette"
                size={18}
                style={{ color: contrastText(activeCustomHex) }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <OutlinedTextField
                label="HEX 代码"
                value={hexInput}
                onInput={handleHexInputChange}
                style={{ width: "100%", fontFamily: "monospace" }}
              >
                <span slot="leading-icon" style={{ fontSize: 14, fontWeight: 600 }}>#</span>
              </OutlinedTextField>
            </div>
            <TonalButton onClick={() => setOpen(false)}>
              完成
            </TonalButton>
          </div>

          {/* Quick Modern Palette Swatches */}
          <div style={{ borderTop: "1px solid var(--md-outline-variant)", paddingTop: 10 }}>
            <div
              className="label-sm muted"
              style={{ marginBottom: 8, fontSize: 12, fontWeight: 500 }}
            >
              推荐配色
            </div>
            <div className="md3-color-swatches-grid">
              {QUICK_SWATCHES.map((swatch) => {
                const isSelected = activeCustomHex.toLowerCase() === swatch.toLowerCase();
                return (
                  <button
                    key={swatch}
                    type="button"
                    className={`md3-color-swatch-item ${isSelected ? "selected" : ""}`}
                    style={{ backgroundColor: swatch }}
                    onClick={() => {
                      const hsv = hexToHsv(swatch);
                      setHue(hsv.h);
                      setSaturation(hsv.s);
                      setVal(hsv.v);
                      setHexInput(swatch.replace("#", "").toUpperCase());
                      onChange(swatch.toLowerCase());
                    }}
                    title={swatch}
                    aria-label={swatch}
                  >
                    {isSelected && (
                      <Icon
                        name="check"
                        size={14}
                        style={{ color: contrastText(swatch) }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
