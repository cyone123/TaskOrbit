import { FeatureScreen } from "@/components/feature-screen";

export default function ProjectsScreen() {
  return (
    <FeatureScreen
      icon="folder-open-outline"
      eyebrow="组织工作"
      title="项目"
      description="在项目上下文中查看任务、计划和关联笔记。"
      accent="#386A20"
      items={[
        {
          icon: "layers-outline",
          title: "项目概览",
          description: "集中呈现进行中、已归档和即将到期的项目。",
        },
        {
          icon: "git-branch-outline",
          title: "任务拆分",
          description: "沿用共享核心中的项目、任务和计划关联规则。",
        },
      ]}
    />
  );
}
