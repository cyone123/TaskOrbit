import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { CircularProgress } from "../material";

export interface AiReasoningAccordionProps {
  reasoning: string;
  isThinking?: boolean;
}

export function AiReasoningAccordion({ reasoning, isThinking = false }: AiReasoningAccordionProps) {
  // Auto-expand while model is actively thinking; allow collapse afterwards
  const [isOpen, setIsOpen] = useState(isThinking);

  useEffect(() => {
    if (isThinking) {
      setIsOpen(true);
    }
  }, [isThinking]);

  if (!reasoning.trim()) return null;

  return (
    <div className="ai-reasoning-panel">
      <button
        type="button"
        className="ai-reasoning-panel__header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "折叠深度思考" : "展开深度思考"}
      >
        <div className="row items-center gap-6">
          <Icon
            name="psychology"
            size={16}
            style={{
              color: isThinking ? "var(--md-primary)" : "var(--md-on-surface-variant)",
            }}
          />
          <span style={{ fontWeight: 500 }}>
            {isThinking ? "正在深度思考..." : "深度思考过程"}
          </span>
          {isThinking && (
            <CircularProgress indeterminate style={{ width: 12, height: 12 }} />
          )}
        </div>

        <div className="row items-center gap-4 muted">
          <span style={{ fontSize: 11 }}>{isOpen ? "收起" : "展开"}</span>
          <Icon
            name="expand_more"
            size={18}
            style={{
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 180ms ease",
            }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="ai-reasoning-panel__body">
          {reasoning}
        </div>
      )}
    </div>
  );
}
