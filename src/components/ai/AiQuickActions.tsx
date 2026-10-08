import { Icon } from "../Icon";

export interface AiQuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function AiQuickActions({ onSelect, disabled }: AiQuickActionsProps) {
  const suggestions = [
    {
      icon: "monitoring",
      label: "效能反思",
      prompt:
        "请分析我过去 7 天的番茄钟专注会话与每日计划完成情况，评估时间分配偏差与专注节奏，并给出改进建议。",
    },
    {
      icon: "calendar_month",
      label: "排期今日",
      prompt:
        "请查看我今天尚未完成的任务与已有计划，识别出空闲时间段，帮我推荐最合理的每日计划时间块排期。",
    },
    {
      icon: "inbox",
      label: "整理收集箱",
      prompt:
        "请帮我整理当前收集箱中未处理的内容。先获取未处理收集箱条目和已有项目列表，分析它们适合归入哪个项目或转化为具体日程计划，并调用 plan_inbox_organization 提出整理方案。",
    },
  ];

  return (
    <div className="row gap-8 items-center" style={{ flexWrap: "wrap", padding: "4px 0" }}>
      {suggestions.map((s) => (
        <button
          key={s.label}
          type="button"
          className="chip"
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            padding: "4px 10px",
            fontSize: 12,
            height: 28,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            borderRadius: 14,
            border: "1px solid var(--md-outline-variant)",
            background: "var(--md-surface-container)",
            color: "var(--md-on-surface-variant)",
          }}
          disabled={disabled}
          onClick={() => onSelect(s.prompt)}
        >
          <Icon name={s.icon} size={14} style={{ color: "var(--md-primary)" }} />
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
