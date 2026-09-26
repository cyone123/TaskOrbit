import { useEffect, useRef } from "react";
import type { AiChatMessage } from "@task-orbit/core";
import { renderMarkdown } from "../../utils/markdown";
import { Icon } from "../Icon";
import { CircularProgress } from "../material";
import { AiProposalCard } from "./AiProposalCard";

export interface AiMessageListProps {
  messages: AiChatMessage[];
  isStreaming: boolean;
  currentToolCall: { name: string; label: string } | null;
  error: string | null;
  onApplyProposal?: (messageId: string, proposalId: string) => void;
  onCancelProposal?: (messageId: string, proposalId: string) => void;
}

export function AiMessageList({
  messages,
  isStreaming,
  currentToolCall,
  error,
  onApplyProposal,
  onCancelProposal,
}: AiMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new content streams in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentToolCall, error]);

  // Display user and assistant messages (intermediate tool messages are hidden from raw stream)
  const displayMessages = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );

  return (
    <div
      className="col gap-12"
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 12px",
      }}
    >
      {displayMessages.length === 0 && (
        <div
          className="col items-center justify-center text-center"
          style={{ flex: 1, padding: "40px 16px", color: "var(--md-on-surface-variant)" }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--md-primary-container)",
              color: "var(--md-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Icon name="smart_toy" size={32} />
          </div>
          <div className="title-md">我是您的个人任务助理</div>
          <div className="body-sm muted mt-8" style={{ maxWidth: 280 }}>
            我可以帮您分析时间分配、整理收集箱中的待办与备忘，或为今日日程提供智能排期建议。
          </div>
        </div>
      )}

      {displayMessages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            className={`col ${isUser ? "items-end" : "items-start"} gap-8`}
            style={{ width: "100%" }}
          >
            {(msg.content || (!msg.proposal && isStreaming)) && (
              <div
                style={{
                  maxWidth: "88%",
                  padding: "10px 14px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isUser
                    ? "var(--md-primary-container)"
                    : "var(--md-surface-container-high)",
                  color: isUser
                    ? "var(--md-on-primary-container)"
                    : "var(--md-on-surface)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                {isUser ? (
                  <div>{msg.content}</div>
                ) : msg.content ? (
                  <div
                    className="ai-markdown-body"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                ) : isStreaming ? (
                  <div className="row items-center gap-8 muted">
                    <CircularProgress indeterminate style={{ width: 14, height: 14 }} />
                    <span className="body-xs">正在思考中...</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Proposal card if present on assistant message */}
            {!isUser && msg.proposal && (
              <div style={{ width: "100%", maxWidth: "96%" }}>
                <AiProposalCard
                  proposal={msg.proposal}
                  onApply={() => onApplyProposal?.(msg.id, msg.proposal!.id)}
                  onCancel={() => onCancelProposal?.(msg.id, msg.proposal!.id)}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Tool calling pill indicator */}
      {currentToolCall && (
        <div className="row justify-start" style={{ width: "100%" }}>
          <div
            className="row items-center gap-8"
            style={{
              padding: "6px 12px",
              borderRadius: 16,
              background: "var(--md-surface-container-highest)",
              border: "1px solid var(--md-outline-variant)",
              color: "var(--md-primary)",
              fontSize: 12,
            }}
          >
            <CircularProgress indeterminate style={{ width: 14, height: 14 }} />
            <span>{currentToolCall.label}</span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          className="app-notice app-notice--error"
          style={{ position: "relative", top: 0, padding: 10, borderRadius: 8 }}
        >
          <div className="row items-center gap-8">
            <Icon name="error" size={18} style={{ color: "var(--md-error)" }} />
            <span className="body-xs" style={{ flex: 1 }}>
              {error}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}
