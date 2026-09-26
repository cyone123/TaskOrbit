import { useState } from "react";
import type { AiToolExecution } from "@task-orbit/core";
import { Icon } from "../Icon";

export interface AiToolCallAccordionProps {
  executions: AiToolExecution[];
}

export function AiToolCallAccordion({ executions }: AiToolCallAccordionProps) {
  // Collapsed by default so conversation remains tidy
  const [isOpen, setIsOpen] = useState(false);

  if (!executions || executions.length === 0) return null;

  return (
    <div className="ai-tool-panel">
      <button
        type="button"
        className="ai-tool-panel__header"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "折叠工具调用明细" : "展开工具调用明细"}
      >
        <div className="row items-center gap-6" style={{ minWidth: 0, flex: 1 }}>
          <Icon name="terminal" size={16} style={{ color: "var(--md-primary)" }} />
          <span style={{ fontWeight: 500 }}>
            已调用工具 ({executions.length})
          </span>
          <div className="row items-center gap-4 ml-4" style={{ overflow: "hidden" }}>
            {executions.map((e, idx) => (
              <span
                key={`${e.id}_${idx}`}
                style={{
                  fontFamily: "monospace",
                  fontSize: 10.5,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--md-surface-container-lowest)",
                  border: "1px solid var(--md-outline-variant)",
                  color: "var(--md-on-surface-variant)",
                }}
              >
                {e.name}
              </span>
            ))}
          </div>
        </div>

        <div className="row items-center gap-4 muted" style={{ flexShrink: 0 }}>
          <span style={{ fontSize: 11 }}>{isOpen ? "收起" : "展开明细"}</span>
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
        <div className="ai-tool-panel__body">
          {executions.map((exec, idx) => {
            const prettyArgs = JSON.stringify(exec.args, null, 2);
            const prettyResult = JSON.stringify(exec.result, null, 2);

            return (
              <div key={`${exec.id}_${idx}`} className="ai-tool-item">
                <div className="ai-tool-item__title">
                  <div className="row items-center gap-6">
                    <Icon name="check_circle" size={14} style={{ color: "var(--color-success, #2e7d32)" }} />
                    <code style={{ fontSize: 12, fontWeight: 600 }}>{exec.name}</code>
                    {exec.label && <span className="muted body-xs">({exec.label})</span>}
                  </div>
                </div>

                <div className="ai-tool-item__section">
                  <div className="ai-tool-item__section-title">输入参数 (Arguments)</div>
                  <pre className="ai-tool-code-block">
                    <code>{prettyArgs}</code>
                  </pre>
                </div>

                <div className="ai-tool-item__section" style={{ borderTop: "1px solid var(--md-outline-variant)" }}>
                  <div className="ai-tool-item__section-title">输出结果 (Result)</div>
                  <pre className="ai-tool-code-block">
                    <code>{prettyResult}</code>
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
