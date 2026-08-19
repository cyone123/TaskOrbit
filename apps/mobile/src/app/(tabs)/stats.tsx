import { FeatureScreen } from "@/components/feature-screen";

export default function StatsScreen() {
  return (
    <FeatureScreen
      icon="bar-chart-outline"
      eyebrow="回顾投入"
      title="统计"
      description="从专注记录中观察时间投入、趋势和项目分布。"
      accent="#8A4A00"
      items={[
        {
          icon: "analytics-outline",
          title: "专注趋势",
          description: "按天、周和项目汇总已完成的专注时长。",
        },
        {
          icon: "pie-chart-outline",
          title: "投入分布",
          description: "使用共享 selector 保持桌面与移动端口径一致。",
        },
      ]}
    />
  );
}
