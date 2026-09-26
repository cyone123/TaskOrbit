import { useState, useRef, type KeyboardEvent } from "react";
import { useStore } from "../../store/store";
import { useAiChat } from "../../store/ai-chat-store";
import { Icon } from "../Icon";
import { IconButton } from "../material";
import { useSnackbar } from "../ui";
import { AiMessageList } from "./AiMessageList";
import { AiQuickActions } from "./AiQuickActions";
import { AiSettingsDialog } from "./AiSettingsDialog";

export function AiChatDrawer() {
  const store = useStore();
  const { show } = useSnackbar();
  const {
    isOpen,
    closeDrawer,
    messages,
    isStreaming,
    currentToolCall,
    error,
    sendMessage,
    stopStreaming,
    clearMessages,
    applyProposal,
    cancelProposal,
  } = useAiChat();

  const [input, setInput] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aiSettings = store.state.aiSettings;

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? input;
    if (!text.trim() || isStreaming) return;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setInput(target.value);
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  };

  const handleRetry = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && !isStreaming) {
      void sendMessage(lastUserMsg.content);
    }
  };

  const isAiConfigured = Boolean(
    aiSettings.enabled && aiSettings.baseUrl.trim() && aiSettings.model.trim(),
  );

  return (
    <>
      <aside
        className="ai-chat-drawer col"
        style={{
          width: 380,
          minWidth: 320,
          maxWidth: "90vw",
          height: "100%",
          background: "var(--md-surface-container-low)",
          borderLeft: "1px solid var(--md-outline-variant)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 40,
        }}
      >
        {/* Drawer Header */}
        <header
          className="row items-center justify-between"
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--md-outline-variant)",
            background: "var(--md-surface-container)",
          }}
        >
          <div className="row items-center gap-8">
            <Icon name="smart_toy" size={22} style={{ color: "var(--md-primary)" }} />
            <span className="title-sm" style={{ fontWeight: 600 }}>
              AI 助理
            </span>
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: aiSettings.enabled
                  ? "var(--md-primary-container)"
                  : "var(--md-surface-container-highest)",
                color: aiSettings.enabled
                  ? "var(--md-on-primary-container)"
                  : "var(--md-on-surface-variant)",
                maxWidth: 110,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={aiSettings.model || "未配置"}
            >
              {aiSettings.model || "未配置"}
            </span>
          </div>

          <div className="row items-center gap-4">
            <IconButton
              onClick={() => setSettingsOpen(true)}
              aria-label="设置"
              title="AI 助理配置"
            >
              <Icon name="settings" size={18} />
            </IconButton>
            <IconButton
              onClick={clearMessages}
              aria-label="清空对话"
              title="清空当前对话"
              disabled={messages.length === 0}
            >
              <Icon name="delete_sweep" size={18} />
            </IconButton>
            <IconButton onClick={closeDrawer} aria-label="关闭侧边栏" title="关闭">
              <Icon name="close" size={20} />
            </IconButton>
          </div>
        </header>

        {/* Message List */}
        <AiMessageList
          messages={messages}
          isStreaming={isStreaming}
          currentToolCall={currentToolCall}
          error={error}
          onApplyProposal={(msgId, propId) => {
            applyProposal(msgId, propId);
            show("已成功应用建议方案");
          }}
          onCancelProposal={(msgId, propId) => {
            cancelProposal(msgId, propId);
            show("已放弃本次建议");
          }}
          onRetry={handleRetry}
          onOpenSettings={() => setSettingsOpen(true)}
          isAiConfigured={isAiConfigured}
        />

        {/* Drawer Footer with Input */}
        <footer
          style={{
            padding: "10px 12px 14px",
            borderTop: "1px solid var(--md-outline-variant)",
            background: "var(--md-surface-container)",
          }}
        >
          <AiQuickActions onSelect={(prompt) => void handleSend(prompt)} disabled={isStreaming} />

          <div
            className="row items-end gap-8 mt-8"
            style={{
              background: "var(--md-surface-container-high)",
              border: "1px solid var(--md-outline-variant)",
              borderRadius: 16,
              padding: "6px 8px 6px 12px",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onInput={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="输入任务、排期或复盘要求...（Enter 发送）"
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                resize: "none",
                fontFamily: "inherit",
                fontSize: 13,
                lineHeight: 1.4,
                color: "var(--md-on-surface)",
                maxHeight: 120,
                padding: "4px 0",
              }}
            />
            {isStreaming ? (
              <IconButton
                onClick={stopStreaming}
                aria-label="停止生成"
                title="停止生成"
                style={{
                  color: "var(--md-error)",
                  width: 32,
                  height: 32,
                }}
              >
                <Icon name="stop_circle" size={22} />
              </IconButton>
            ) : (
              <IconButton
                onClick={() => void handleSend()}
                disabled={!input.trim()}
                aria-label="发送"
                title="发送"
                style={{
                  color: input.trim() ? "var(--md-primary)" : "var(--md-on-surface-variant)",
                  width: 32,
                  height: 32,
                }}
              >
                <Icon name="send" size={20} />
              </IconButton>
            )}
          </div>
        </footer>
      </aside>

      <AiSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
