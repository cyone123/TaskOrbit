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
