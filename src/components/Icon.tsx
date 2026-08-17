interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
  slot?: string;
  style?: React.CSSProperties;
}

/** Material Symbols (rounded) icon via the ligature font. */
export function Icon({ name, size = 24, fill = false, className, slot, style }: IconProps) {
  const opsz = Math.min(48, Math.max(20, size));
  return (
    <span
      className={`mso ${className ?? ""}`}
      slot={slot}
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' ${opsz}`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
