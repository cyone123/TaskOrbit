import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  READ_ONLY_TOOLS,
  executeReadTool,
  streamChatCompletions,
  todayISO,
  uid,
  type AiChatMessage,
  type AiToolCall,
} from "@task-orbit/core";
import { useStore } from "./store";

const LS_CHAT_HISTORY_KEY = "task-orbit-ai-chat-messages";
const MAX_SAVED_MESSAGES = 40;

const TOOL_LABELS: Record<string, string> = {
  get_workspace_summary: "正在读取工作区概况...",
  get_inbox_items: "正在获取收集箱条目...",
  get_projects_and_tasks: "正在查询项目与任务列表...",
  get_daily_plans: "正在检索日程计划时间块...",
  get_pomodoro_stats: "正在统计番茄钟专注记录...",
};

export interface AiChatStoreApi {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  messages: AiChatMessage[];
  isStreaming: boolean;
  currentToolCall: { name: string; label: string } | null;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

const AiChatContext = createContext<AiChatStoreApi | null>(null);

function loadSavedMessages(): AiChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_CHAT_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AiChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(messages: AiChatMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = messages.slice(-MAX_SAVED_MESSAGES);
    localStorage.setItem(LS_CHAT_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore localStorage write error
  }
}

export function AiChatProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>(() => loadSavedMessages());
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<{
    name: string;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessages([]);
    setIsStreaming(false);
    setCurrentToolCall(null);
    setError(null);
    saveMessages([]);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentToolCall(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const aiSettings = store.state.aiSettings;
      if (!aiSettings.enabled || !aiSettings.baseUrl.trim() || !aiSettings.model.trim()) {
        setIsOpen(true);
        const warningMsg: AiChatMessage = {
          id: uid("msg_"),
          role: "assistant",
          content:
            "⚠️ **AI 助理尚未配置或未启用**\n\n请点击导航栏底部的 **AI 助理设置** 图标，配置服务地址 (Base URL)、API Key 以及模型名称，并开启启用开关。",
          createdAt: Date.now(),
        };
        const updated = [...messagesRef.current, { id: uid("msg_"), role: "user" as const, content: trimmed, createdAt: Date.now() }, warningMsg];
        setMessages(updated);
        saveMessages(updated);
        return;
      }

      setIsOpen(true);
      setError(null);

      const userMessage: AiChatMessage = {
        id: uid("msg_"),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      let history = [...messagesRef.current, userMessage];
      setMessages(history);
      saveMessages(history);

      const systemPrompt: AiChatMessage = {
        id: "sys_runtime",
        role: "system",
        content: `你是一个高效、细致的个人效能与任务管理 AI 助理（内置于 Task Orbit 个人生产力套件中）。
当前日期：${todayISO()}。
你可以使用工具查询用户当前的工作区概况、项目列表、任务属性、日程计划排期以及番茄钟专注统计。
在面对任务分析、日程排期和复盘时，请积极调用相关只读工具检索客观事实，并基于真实数据输出条理清晰、切合实际、富有洞察力的中文建议。
支持 Markdown 排版（列表、代码块、加粗等）。`,
      };

      setIsStreaming(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let conversationForApi: AiChatMessage[] = [systemPrompt, ...history];
        let iteration = 0;
        const maxIterations = 5;

        while (iteration < maxIterations) {
          iteration += 1;
          const assistantMsgId = uid("msg_");
          let accumulatedContent = "";
          const toolCallsMap = new Map<number, AiToolCall>();

          // Add empty assistant message placeholder to UI
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: "",
              createdAt: Date.now(),
            },
          ]);

          const stream = streamChatCompletions({
            baseUrl: aiSettings.baseUrl,
            apiKey: aiSettings.apiKey,
            model: aiSettings.model,
            temperature: aiSettings.temperature,
            messages: conversationForApi,
            tools: READ_ONLY_TOOLS,
            signal: controller.signal,
          });

          for await (const chunk of stream) {
            if (chunk.delta.content) {
              accumulatedContent += chunk.delta.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: accumulatedContent } : m,
                ),
              );
            }

            if (chunk.delta.tool_calls) {
              for (const tc of chunk.delta.tool_calls) {
                const existing = toolCallsMap.get(tc.index) || {
                  id: tc.id || `call_${tc.index}`,
                  type: "function" as const,
                  function: { name: "", arguments: "" },
                };
                if (tc.id) existing.id = tc.id;
                if (tc.function?.name) existing.function.name += tc.function.name;
                if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                toolCallsMap.set(tc.index, existing);
              }
            }
          }

          const resolvedToolCalls = Array.from(toolCallsMap.values());
          const finalAssistantMsg: AiChatMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: accumulatedContent,
            tool_calls: resolvedToolCalls.length > 0 ? resolvedToolCalls : undefined,
            createdAt: Date.now(),
          };

          // Update final assistant message in history
          history = [...history, finalAssistantMsg];
          setMessages(history);
          saveMessages(history);
          conversationForApi = [...conversationForApi, finalAssistantMsg];

          // If no tool calls requested, we are done
          if (resolvedToolCalls.length === 0) {
            break;
          }

          // Execute read tool calls
          let hasExecutedReadTool = false;
          for (const tc of resolvedToolCalls) {
            const toolName = tc.function.name;
            const label = TOOL_LABELS[toolName] || `正在调用 ${toolName}...`;
            setCurrentToolCall({ name: toolName, label });

            let args: Record<string, unknown> = {};
            try {
              if (tc.function.arguments.trim()) {
                args = JSON.parse(tc.function.arguments);
              }
            } catch {
              args = {};
            }

            let toolResult: unknown;
            try {
              toolResult = executeReadTool(store.state, toolName, args);
            } catch (toolErr) {
              toolResult = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
            }

            const toolResponseMsg: AiChatMessage = {
              id: uid("msg_"),
              role: "tool",
              name: toolName,
              tool_call_id: tc.id,
              content: JSON.stringify(toolResult),
              createdAt: Date.now(),
            };

            conversationForApi.push(toolResponseMsg);
            hasExecutedReadTool = true;
          }

          setCurrentToolCall(null);
          if (!hasExecutedReadTool) {
            break;
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User aborted streaming, keep generated partial content
        } else {
          const message = err instanceof Error ? err.message : String(err);
          setError(message);
        }
      } finally {
        setIsStreaming(false);
        setCurrentToolCall(null);
        abortControllerRef.current = null;
      }
    },
    [store.state],
  );

  return (
    <AiChatContext.Provider
      value={{
        isOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        messages,
        isStreaming,
        currentToolCall,
        error,
        sendMessage,
        stopStreaming,
        clearMessages,
      }}
    >
      {children}
    </AiChatContext.Provider>
  );
}

export function useAiChat(): AiChatStoreApi {
  const ctx = useContext(AiChatContext);
  if (!ctx) {
    throw new Error("useAiChat must be used within an AiChatProvider");
  }
  return ctx;
}
