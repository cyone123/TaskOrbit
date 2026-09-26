import type {
  AiProposalCardState,
  DailyPlanScheduleProposalItem,
  InboxOrganizationProposalItem,
} from "@task-orbit/core";
import { Icon } from "../Icon";
import { FilledButton, TextButton } from "../material";

export interface AiProposalCardProps {
  proposal: AiProposalCardState;
  onApply: () => void;
  onCancel: () => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  high: "高优",
  medium: "中优",
  low: "低优",
};

function InboxProposalItemRow({ item }: { item: InboxOrganizationProposalItem }) {
  const isTask = item.action === "convert_to_task";
  const isPlan = item.action === "convert_to_daily_plan";
  const isDone = item.action === "mark_done";

  return (
    <div className="ai-proposal-item">
      {/* Source item header */}
      <div className="ai-proposal-item__source row items-center gap-6">
        <span className="ai-proposal-item__tag">原待办</span>
        <span className="ai-proposal-item__content truncate" title={item.sourceContent}>
          {item.sourceContent || `ID: ${item.inboxItemId}`}
        </span>
      </div>

      {/* Target action flow */}
      <div className="ai-proposal-item__target row items-start gap-8 mt-6">
        <div className="ai-proposal-item__arrow" aria-hidden="true">
          <Icon name="subdirectory_arrow_right" size={16} />
        </div>

        <div className="ai-proposal-item__result col gap-4" style={{ flex: 1, minWidth: 0 }}>
          {isTask && item.taskData && (
            <>
              <div className="row items-center gap-6 flex-wrap">
                <span className="ai-action-chip ai-action-chip--task">新建任务</span>
                <span className="ai-proposal-item__name font-medium">
                  {item.taskData.name}
                </span>
              </div>
              <div className="row items-center gap-8 body-xs muted flex-wrap mt-2">
                {item.targetProjectName && (
                  <span className="row items-center gap-4">
                    <Icon name="folder" size={14} />
                    <span>{item.targetProjectName}</span>
                  </span>
                )}
                <span className="row items-center gap-4">
                  <Icon name="event" size={14} />
                  <span>
                    {item.taskData.startDate === item.taskData.endDate
                      ? item.taskData.startDate
                      : `${item.taskData.startDate} ~ ${item.taskData.endDate}`}
                  </span>
                </span>
                {item.taskData.priority && item.taskData.priority !== "medium" && (
                  <span
                    className={`ai-priority-badge ai-priority-badge--${item.taskData.priority}`}
                  >
                    {PRIORITY_LABELS[item.taskData.priority] || item.taskData.priority}
                  </span>
                )}
              </div>
            </>
          )}

          {isPlan && item.dailyPlanData && (
            <>
              <div className="row items-center gap-6 flex-wrap">
                <span className="ai-action-chip ai-action-chip--plan">日程时间块</span>
                <span className="ai-proposal-item__name font-medium">
                  {item.dailyPlanData.name}
                </span>
              </div>
              <div className="row items-center gap-8 body-xs muted flex-wrap mt-2">
                <span className="row items-center gap-4">
                  <Icon name="schedule" size={14} />
                  <span>
                    {item.dailyPlanData.date} {item.dailyPlanData.startTime} -{" "}
                    {item.dailyPlanData.endTime}
                  </span>
                </span>
                {item.dailyPlanData.estimatedMinutes && (
                  <span>({item.dailyPlanData.estimatedMinutes} 分钟)</span>
                )}
              </div>
            </>
          )}

          {isDone && (
            <div className="row items-center gap-6">
              <span className="ai-action-chip ai-action-chip--done">标记完成</span>
              <span className="body-sm muted">已处理完成，直接勾选归档</span>
            </div>
          )}

          {item.action === "dismiss" && (
            <div className="row items-center gap-6">
              <span className="ai-action-chip ai-action-chip--dismiss">保持不变</span>
              <span className="body-sm muted">继续保留在收集箱中</span>
            </div>
          )}

          {item.reason && (
            <div className="ai-proposal-item__reason body-xs muted mt-4">
              💡 {item.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleProposalItemRow({ item }: { item: DailyPlanScheduleProposalItem }) {
  const isCreate = item.action === "create";
  const isReschedule = item.action === "reschedule";
  const isDelete = item.action === "delete";

  const displayName = item.newPlan?.name || item.originalPlanName || "日程计划";

  return (
    <div className="ai-proposal-item">
      <div className="row items-start gap-8">
        <div className="ai-proposal-item__result col gap-4" style={{ flex: 1, minWidth: 0 }}>
          {isCreate && item.newPlan && (
            <>
              <div className="row items-center gap-6 flex-wrap">
                <span className="ai-action-chip ai-action-chip--plan">新增计划</span>
                <span className="ai-proposal-item__name font-medium">{displayName}</span>
              </div>
              <div className="row items-center gap-8 body-xs muted flex-wrap mt-2">
                <span className="row items-center gap-4">
                  <Icon name="schedule" size={14} />
                  <span>
                    {item.newPlan.date} {item.newPlan.startTime} - {item.newPlan.endTime}
                  </span>
                </span>
                {item.newPlan.estimatedMinutes && (
                  <span>({item.newPlan.estimatedMinutes} 分钟)</span>
                )}
              </div>
            </>
          )}

          {isReschedule && item.newPlan && (
            <>
              <div className="row items-center gap-6 flex-wrap">
                <span className="ai-action-chip ai-action-chip--reschedule">时间调整</span>
                <span className="ai-proposal-item__name font-medium">{displayName}</span>
              </div>
              <div className="row items-center gap-6 body-xs mt-2 flex-wrap">
                {item.originalTime && (
                  <span className="muted line-through">
                    {item.originalTime.startTime} - {item.originalTime.endTime}
                  </span>
                )}
                <Icon name="arrow_forward" size={14} style={{ color: "var(--md-primary)" }} />
                <span className="font-medium" style={{ color: "var(--md-primary)" }}>
                  {item.newPlan.startTime} - {item.newPlan.endTime}
                </span>
                {item.newPlan.estimatedMinutes && (
                  <span className="muted">({item.newPlan.estimatedMinutes} 分钟)</span>
                )}
              </div>
            </>
          )}

          {isDelete && (
            <div className="row items-center gap-6">
              <span className="ai-action-chip ai-action-chip--delete">取消计划</span>
              <span className="ai-proposal-item__name line-through muted">
                {displayName}
              </span>
            </div>
          )}

          {item.reason && (
            <div className="ai-proposal-item__reason body-xs muted mt-4">
              💡 {item.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiProposalCard({ proposal, onApply, onCancel }: AiProposalCardProps) {
  const isPending = proposal.status === "pending";
  const isApplied = proposal.status === "applied";
  const isCancelled = proposal.status === "cancelled";

  const isSchedule = proposal.type === "schedule_daily_plans";
  const inboxItems = proposal.inboxPayload?.proposals || [];
  const scheduleItems = proposal.schedulePayload?.proposals || [];

  const title = isSchedule
    ? `建议的日程排期方案 (${proposal.schedulePayload?.targetDate || "今日"})`
    : "建议的收集箱整理方案";

  return (
    <div className={`ai-proposal-card ai-proposal-card--${proposal.status}`}>
      {/* Header */}
      <div className="ai-proposal-card__header row items-center justify-between">
        <div className="row items-center gap-6">
          <Icon
            name={isSchedule ? "calendar_month" : "auto_awesome"}
            size={18}
            style={{ color: "var(--md-primary)" }}
          />
          <span className="title-sm font-medium">{title}</span>
        </div>

        {isPending && (
          <span className="ai-status-badge ai-status-badge--pending">待确认</span>
        )}
        {isApplied && (
          <span className="ai-status-badge ai-status-badge--applied">已应用</span>
        )}
        {isCancelled && (
          <span className="ai-status-badge ai-status-badge--cancelled">已放弃</span>
        )}
      </div>

      {/* Body / Items Diff */}
      <div className="ai-proposal-card__body col gap-10 mt-8">
        {!isSchedule &&
          inboxItems.map((item, idx) => (
            <InboxProposalItemRow key={`${item.inboxItemId}_${idx}`} item={item} />
          ))}

        {isSchedule &&
          scheduleItems.map((item, idx) => (
            <ScheduleProposalItemRow
              key={`${item.planId || item.newPlan?.name}_${idx}`}
              item={item}
            />
          ))}
      </div>

      {/* Footer Actions */}
      <div className="ai-proposal-card__footer row items-center justify-end gap-8 mt-12 pt-8">
        {isPending ? (
          <>
            <TextButton onClick={onCancel}>
              <Icon name="close" size={16} slot="icon" />
              放弃
            </TextButton>
            <FilledButton onClick={onApply}>
              <Icon name="check" size={16} slot="icon" />
              确认应用
            </FilledButton>
          </>
        ) : isApplied ? (
          <div
            className="row items-center gap-6 body-xs"
            style={{ color: "var(--color-success, #2e7d32)" }}
          >
            <Icon name="check_circle" size={16} />
            <span>已成功应用到您的任务与日程</span>
          </div>
        ) : (
          <div className="row items-center gap-6 body-xs muted">
            <Icon name="do_not_disturb" size={16} />
            <span>已放弃此项建议</span>
          </div>
        )}
      </div>
    </div>
  );
}
