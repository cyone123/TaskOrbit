import { FeatureScreen } from "@/components/feature-screen";

export default function CalendarScreen() {
  return (
    <FeatureScreen
      icon="calendar-outline"
      eyebrow="安排时间"
      title="日历"
      description="用适合触屏的日、周、月视图安排每日计划。"
      accent="#006A6A"
      items={[
        {
          icon: "today-outline",
          title: "今日时间线",
          description: "优先呈现今天的计划和空闲时间。",
        },
        {
          icon: "repeat-outline",
          title: "重复计划",
          description: "复用 core 的每日、每周和每月重复规则。",
        },
      ]}
    />
  );
}
