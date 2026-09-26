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
  ALL_AI_TOOLS,
  commitInboxProposal,
  commitScheduleProposal,
  executeReadTool,
  extractReasoningAndContent,
  streamChatCompletions,
  todayISO,
  uid,
  type AiChatMessage,
  type AiProposalCardState,
  type AiToolCall,
  type AiToolExecution,
  type DailyPlanScheduleProposalItem,
  type InboxOrganizationProposalItem,
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
  plan_inbox_organization: "正在规划收集箱整理方案...",
  plan_schedule_daily_plans: "正在计算最佳日程排期...",
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
  applyProposal: (messageId: string, proposalId: string) => void;
  cancelProposal: (messageId: string, proposalId: string) => void;
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

核心执行规范：
1. 收集箱整理：必须先调用 get_inbox_items 获取未处理条目，并调用 get_projects_and_tasks 获取可用项目列表；经过分析后，调用 plan_inbox_organization 提交整理方案。
2. 日程排期：先调用 get_daily_plans 和 get_projects_and_tasks 查看今日日程与高优待办，分析时间空隙后再给出建议。
3. 效能复盘：调用 get_pomodoro_stats 分析近期专注会话，结合实际数据给出客观反思与时间分配改进建议。

注意：任何涉及修改或写入数据的操作（如整理收集箱），必须通过调用对应的 plan_* 工具向用户呈现结构化确认卡片，严禁假装已经直接写入。
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
          let accumulatedReasoning = "";
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
            tools: ALL_AI_TOOLS,
            signal: controller.signal,
          });

          for await (const chunk of stream) {
            if (chunk.delta.reasoning_content) {
              accumulatedReasoning += chunk.delta.reasoning_content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, reasoningContent: accumulatedReasoning }
                    : m,
                ),
              );
            }

            if (chunk.delta.content) {
              accumulatedContent += chunk.delta.content;
              const parsed = extractReasoningAndContent(
                accumulatedContent,
                accumulatedReasoning,
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: parsed.content,
                        reasoningContent: parsed.reasoning || undefined,
                      }
                    : m,
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
          const parsed = extractReasoningAndContent(
            accumulatedContent,
            accumulatedReasoning,
          );
          const finalAssistantMsg: AiChatMessage = {
            id: assistantMsgId,
            role: "assistant",
            content: parsed.content,
            reasoningContent: parsed.reasoning || undefined,
            tool_calls: resolvedToolCalls.length > 0 ? resolvedToolCalls : undefined,
            toolExecutions: [],
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

          // Execute tool calls
          let hasExecutedTool = false;
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

            // Handle write proposal tool: plan_inbox_organization
            if (toolName === "plan_inbox_organization") {
              const rawProposals = Array.isArray(args.proposals)
                ? (args.proposals as InboxOrganizationProposalItem[])
                : [];

              const enrichedProposals: InboxOrganizationProposalItem[] = rawProposals.map(
                (p) => {
                  const originalItem = store.state.inboxItems.find(
                    (i) => i.id === p.inboxItemId,
                  );
                  const targetProject = p.taskData?.projectId
                    ? store.state.projects.find(
                        (proj) => proj.id === p.taskData?.projectId,
                      )?.name
                    : undefined;

                  return {
                    ...p,
                    sourceContent:
                      p.sourceContent || originalItem?.content || `条目 ${p.inboxItemId}`,
                    targetProjectName: p.targetProjectName || targetProject,
                  };
                },
              );

              const proposalState: AiProposalCardState = {
                id: uid("prop_"),
                type: "inbox_organization",
                status: "pending",
                createdAt: Date.now(),
                inboxPayload: { proposals: enrichedProposals },
              };

              const proposalResult = {
                status: "proposal_rendered",
                count: enrichedProposals.length,
                message:
                  "整理方案卡片已成功生成并呈现给用户，等待用户在卡片上确认操作后才会应用入库。",
              };

              finalAssistantMsg.proposal = proposalState;
              finalAssistantMsg.toolExecutions = [
                ...(finalAssistantMsg.toolExecutions || []),
                {
                  id: tc.id,
                  name: toolName,
                  label,
                  args,
                  result: proposalResult,
                  timestamp: Date.now(),
                },
              ];
              const updatedHistory = history.map((m) =>
                m.id === assistantMsgId ? { ...finalAssistantMsg } : m,
              );
              history = updatedHistory;
              setMessages(updatedHistory);
              saveMessages(updatedHistory);

              const toolResponseMsg: AiChatMessage = {
                id: uid("msg_"),
                role: "tool",
                name: toolName,
                tool_call_id: tc.id,
                content: JSON.stringify(proposalResult),
                createdAt: Date.now(),
              };

              conversationForApi.push(toolResponseMsg);
              hasExecutedTool = true;
              continue;
            }

            // Handle write proposal tool: plan_schedule_daily_plans
            if (toolName === "plan_schedule_daily_plans") {
              const targetDate =
                typeof args.targetDate === "string" ? args.targetDate : todayISO();
              const rawProposals = Array.isArray(args.proposals)
                ? (args.proposals as DailyPlanScheduleProposalItem[])
                : [];

              const enrichedProposals: DailyPlanScheduleProposalItem[] = rawProposals.map(
                (p) => {
                  const existingPlan = p.planId
                    ? store.state.dailyPlans.find((plan) => plan.id === p.planId)
                    : undefined;

                  return {
                    ...p,
                    originalPlanName: p.originalPlanName || existingPlan?.name,
                    originalTime:
                      p.originalTime ||
                      (existingPlan
                        ? {
                            date: existingPlan.date,
                            startTime: existingPlan.startTime,
                            endTime: existingPlan.endTime,
                          }
                        : undefined),
                  };
                },
              );

              const proposalState: AiProposalCardState = {
                id: uid("prop_"),
                type: "schedule_daily_plans",
                status: "pending",
                createdAt: Date.now(),
                schedulePayload: {
                  targetDate,
                  proposals: enrichedProposals,
                },
              };

              const proposalResult = {
                status: "proposal_rendered",
                targetDate,
                count: enrichedProposals.length,
                message:
                  "日程排期方案卡片已成功生成并呈现给用户，等待用户在卡片上确认操作后才会应用入库。",
              };

              finalAssistantMsg.proposal = proposalState;
              finalAssistantMsg.toolExecutions = [
                ...(finalAssistantMsg.toolExecutions || []),
                {
                  id: tc.id,
                  name: toolName,
                  label,
                  args,
                  result: proposalResult,
                  timestamp: Date.now(),
                },
              ];
              const updatedHistory = history.map((m) =>
                m.id === assistantMsgId ? { ...finalAssistantMsg } : m,
              );
              history = updatedHistory;
              setMessages(updatedHistory);
              saveMessages(updatedHistory);

              const toolResponseMsg: AiChatMessage = {
                id: uid("msg_"),
                role: "tool",
                name: toolName,
                tool_call_id: tc.id,
                content: JSON.stringify(proposalResult),
                createdAt: Date.now(),
              };

              conversationForApi.push(toolResponseMsg);
              hasExecutedTool = true;
              continue;
            }

            // Handle read tools
            let toolResult: unknown;
            try {
              toolResult = executeReadTool(store.state, toolName, args);
            } catch (toolErr) {
              toolResult = {
                error: toolErr instanceof Error ? toolErr.message : String(toolErr),
              };
            }

            finalAssistantMsg.toolExecutions = [
              ...(finalAssistantMsg.toolExecutions || []),
              {
                id: tc.id,
                name: toolName,
                label,
                args,
                result: toolResult,
                timestamp: Date.now(),
              },
            ];
            const updatedHistory = history.map((m) =>
              m.id === assistantMsgId ? { ...finalAssistantMsg } : m,
            );
            history = updatedHistory;
            setMessages(updatedHistory);
            saveMessages(updatedHistory);

            const toolResponseMsg: AiChatMessage = {
              id: uid("msg_"),
              role: "tool",
              name: toolName,
              tool_call_id: tc.id,
              content: JSON.stringify(toolResult),
              createdAt: Date.now(),
            };

            conversationForApi.push(toolResponseMsg);
            hasExecutedTool = true;
          }

          setCurrentToolCall(null);
          if (!hasExecutedTool) {
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
    [store],
  );

  const applyProposal = useCallback(
    (messageId: string, proposalId: string) => {
      const targetMsg = messagesRef.current.find((m) => m.id === messageId);
      if (!targetMsg || !targetMsg.proposal || targetMsg.proposal.id !== proposalId) {
        return;
      }
      if (targetMsg.proposal.status !== "pending") {
        return;
      }

      if (
        targetMsg.proposal.type === "inbox_organization" &&
        targetMsg.proposal.inboxPayload
      ) {
        try {
          store.mutate((currentState) =>
            commitInboxProposal(currentState, targetMsg.proposal!.inboxPayload!),
          );
          const updated = messagesRef.current.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  proposal: {
                    ...m.proposal!,
                    status: "applied" as const,
                  },
                }
              : m,
          );
          setMessages(updated);
          saveMessages(updated);
        } catch (err) {
          console.error("Failed to commit inbox proposal:", err);
        }
      } else if (
        targetMsg.proposal.type === "schedule_daily_plans" &&
        targetMsg.proposal.schedulePayload
      ) {
        try {
          store.mutate((currentState) =>
            commitScheduleProposal(currentState, targetMsg.proposal!.schedulePayload!),
          );
          const updated = messagesRef.current.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  proposal: {
                    ...m.proposal!,
                    status: "applied" as const,
                  },
                }
              : m,
          );
          setMessages(updated);
          saveMessages(updated);
        } catch (err) {
          console.error("Failed to commit schedule proposal:", err);
        }
      }
    },
    [store],
  );

  const cancelProposal = useCallback((messageId: string, proposalId: string) => {
    const targetMsg = messagesRef.current.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.proposal || targetMsg.proposal.id !== proposalId) {
      return;
    }
    if (targetMsg.proposal.status !== "pending") {
      return;
    }

    const updated = messagesRef.current.map((m) =>
      m.id === messageId
        ? {
            ...m,
            proposal: {
              ...m.proposal!,
              status: "cancelled" as const,
            },
          }
        : m,
    );
    setMessages(updated);
    saveMessages(updated);
  }, []);

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
        applyProposal,
        cancelProposal,
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
