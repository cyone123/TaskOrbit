import { FeatureScreen } from "@/components/feature-screen";

export default function PomodoroScreen() {
  return (
    <FeatureScreen
      icon="timer-outline"
      eyebrow="保持专注"
      title="番茄钟"
      description="延续基于时间戳的可靠计时，并为后台完成提醒预留接口。"
      accent="#B3261E"
      items={[
        {
          icon: "play-circle-outline",
          title: "专注与休息",
          description: "共享计时状态机负责开始、暂停、跳过和恢复。",
        },
        {
          icon: "link-outline",
          title: "关联上下文",
          description: "专注记录可关联项目、任务和每日计划。",
        },
      ]}
    />
  );
}
