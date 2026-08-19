import { FeatureScreen } from "@/components/feature-screen";

export default function InboxScreen() {
  return (
    <FeatureScreen
      icon="file-tray-outline"
      eyebrow="快速收集"
      title="收件箱"
      description="随手记录待办和灵感，再决定它们属于哪个项目。"
      accent="#6750A4"
      items={[
        {
          icon: "checkbox-outline",
          title: "轻量待办",
          description: "快速捕获，不要求预先选择项目或日期。",
        },
        {
          icon: "document-text-outline",
          title: "临时笔记",
          description: "保留稍后整理的想法、链接和片段。",
        },
      ]}
    />
  );
}
