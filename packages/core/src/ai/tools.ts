import type { AiToolDefinition } from "./types";

export const READ_ONLY_TOOLS: AiToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_workspace_summary",
      description:
        "获取当前工作区的整体概览，包括进行中的项目列表及进度、今日日程计划完成情况、未整理收集箱条目数以及当前番茄钟状态。",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inbox_items",
      description:
        "获取收集箱中的碎片条目列表，可筛选待办 (todo) 或备忘 (note)，以及是否已处理完成。",
      parameters: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["all", "todo", "note"],
            description: "条目类型筛选，默认为 all（全部）",
          },
          done: {
            type: "boolean",
            description: "是否已处理完成。默认为 false（仅获取未处理项）",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_projects_and_tasks",
      description:
        "获取项目与任务列表，可按项目 ID 筛选，可配置是否包含已完成任务与已归档项目。",
      parameters: {
        type: "object",
        properties: {
          projectId: {
            type: "string",
            description: "可选的项目 ID。若不提供则获取所有项目及其任务",
          },
          includeArchivedProjects: {
            type: "boolean",
            description: "是否包含已归档的项目，默认为 false",
          },
          includeDoneTasks: {
            type: "boolean",
            description: "是否包含已完成的任务，默认为 true",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_daily_plans",
      description:
        "查询指定日期区间内的每日日程计划时间块，包括计划名称、起止时间、所属任务/项目与完成状态。",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "起始日期，格式 YYYY-MM-DD",
          },
          endDate: {
            type: "string",
            description: "截止日期，格式 YYYY-MM-DD",
          },
        },
        required: ["startDate", "endDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pomodoro_stats",
      description:
        "聚合统计指定日期范围或最近 N 天的番茄钟专注记录，返回总专注时长、专注次数、按项目耗时分布及每日专注趋势。",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "最近天数（例如 7 表示最近一周，30 表示最近一个月），默认 7",
          },
          startDate: {
            type: "string",
            description: "可选的自定义起始日期，格式 YYYY-MM-DD",
          },
          endDate: {
            type: "string",
            description: "可选的自定义截止日期，格式 YYYY-MM-DD",
          },
        },
      },
    },
  },
];

export const INBOX_ORGANIZATION_TOOL: AiToolDefinition = {
  type: "function",
  function: {
    name: "plan_inbox_organization",
    description:
      "将收集箱中的零散未处理条目整理并提议转化为项目任务、日程每日计划，或直接标记完成/忽略。此工具会向用户呈现结构化确认卡片，待用户确认后才实际执行写入变更。",
    parameters: {
      type: "object",
      properties: {
        proposals: {
          type: "array",
          description: "针对每个收集箱条目的整理建议列表",
          items: {
            type: "object",
            properties: {
              inboxItemId: {
                type: "string",
                description: "对应的收集箱条目 ID",
              },
              sourceContent: {
                type: "string",
                description: "原收集箱条目内容（可选，用于卡片回显）",
              },
              action: {
                type: "string",
                enum: [
                  "convert_to_task",
                  "convert_to_daily_plan",
                  "mark_done",
                  "dismiss",
                ],
                description:
                  "处理动作：convert_to_task（转为任务）、convert_to_daily_plan（转为每日计划）、mark_done（标记完成）、dismiss（仅在收集箱保留）",
              },
              targetProjectName: {
                type: "string",
                description: "目标项目名称（可选，用于在卡片中向用户直观展示）",
              },
              taskData: {
                type: "object",
                description: "当 action 为 convert_to_task 时的任务数据",
                properties: {
                  projectId: { type: "string", description: "所属项目 ID" },
                  name: { type: "string", description: "任务标题" },
                  description: { type: "string", description: "任务描述详情" },
                  startDate: { type: "string", description: "任务开始日期 YYYY-MM-DD" },
                  endDate: { type: "string", description: "任务截止日期 YYYY-MM-DD" },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "优先级，默认 medium",
                  },
                },
              },
              dailyPlanData: {
                type: "object",
                description: "当 action 为 convert_to_daily_plan 时的计划数据",
                properties: {
                  projectId: {
                    type: "string",
                    description: "关联项目 ID（可选，传 null 或不传表示无项目）",
                  },
                  taskId: {
                    type: "string",
                    description: "关联任务 ID（可选，传 null 或不传表示无任务）",
                  },
                  name: { type: "string", description: "计划名称" },
                  description: { type: "string", description: "计划描述" },
                  date: { type: "string", description: "计划日期 YYYY-MM-DD" },
                  startTime: { type: "string", description: "起始时间 HH:mm" },
                  endTime: { type: "string", description: "结束时间 HH:mm" },
                  estimatedMinutes: {
                    type: "number",
                    description: "预计耗时（分钟）",
                  },
                },
              },
              reason: {
                type: "string",
                description: "归类理由简述",
              },
            },
          },
        },
      },
      required: ["proposals"],
    },
  },
};

export const ALL_AI_TOOLS: AiToolDefinition[] = [
  ...READ_ONLY_TOOLS,
  INBOX_ORGANIZATION_TOOL,
];
