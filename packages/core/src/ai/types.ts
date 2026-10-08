import type { Priority } from "../types";

export interface AiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export type AiProposalStatus = "pending" | "applied" | "cancelled";

export interface InboxOrganizationProposalItem {
  inboxItemId: string;
  sourceContent?: string;
  action: "convert_to_task" | "convert_to_daily_plan" | "mark_done" | "dismiss";
  targetProjectName?: string;
  taskData?: {
    projectId: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    priority?: Priority;
  };
  dailyPlanData?: {
    projectId?: string | null;
    taskId?: string | null;
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    estimatedMinutes?: number;
  };
  reason?: string;
}

export interface InboxOrganizationProposalPayload {
  proposals: InboxOrganizationProposalItem[];
}

export interface DailyPlanScheduleProposalItem {
  action: "create" | "reschedule" | "delete";
  planId?: string;
  originalPlanName?: string;
  originalTime?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  newPlan?: {
    projectId?: string | null;
    taskId?: string | null;
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    estimatedMinutes?: number;
  };
  reason?: string;
}

export interface DailyPlanScheduleProposalPayload {
  targetDate: string;
  proposals: DailyPlanScheduleProposalItem[];
}

export interface AiProposalCardState {
  id: string;
  type: "inbox_organization" | "schedule_daily_plans";
  status: AiProposalStatus;
  createdAt: number;
  inboxPayload?: InboxOrganizationProposalPayload;
  schedulePayload?: DailyPlanScheduleProposalPayload;
}

export interface AiToolExecution {
  id: string;
  name: string;
  label?: string;
  args: Record<string, unknown>;
  result: unknown;
  timestamp?: number;
}

export interface AiChatMessage {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  reasoningContent?: string;
  toolExecutions?: AiToolExecution[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: AiToolCall[];
  proposal?: AiProposalCardState;
  createdAt?: number;
}

export interface AiToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface AiToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, AiToolParameterProperty>;
      required?: string[];
    };
  };
}

export interface StreamDelta {
  content?: string;
  reasoning_content?: string;
  tool_calls?: Array<{
    index: number;
    id?: string;
    type?: "function";
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

export interface StreamChunk {
  id: string;
  model: string;
  delta: StreamDelta;
  finish_reason: string | null;
}

export type { AiProtocolType } from "../types";

export type UnifiedStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "tool_call_start"; id: string; name: string }
  | { type: "tool_call_args_delta"; id: string; delta: string }
  | { type: "tool_call_end"; id: string }
  | { type: "finish"; reason: "stop" | "tool_calls" | "length" | "error"; rawMessage?: string };

