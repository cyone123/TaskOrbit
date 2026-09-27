import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StoreProvider } from "../store/store";
import { SnackbarProvider } from "../components/ui";
import { SettingsView } from "./SettingsView";

describe("SettingsView", () => {
  it("renders all setting sections in default view", () => {
    const html = renderToStaticMarkup(
      <StoreProvider>
        <SnackbarProvider>
          <SettingsView />
        </SnackbarProvider>
      </StoreProvider>
    );

    // Check Tab navigation
    expect(html).toContain("全部");
    expect(html).toContain("外观偏好");
    expect(html).toContain("日历显示");
    expect(html).toContain("专注番茄");
    expect(html).toContain("AI 助理");
    expect(html).toContain("数据与同步");

    // Check Section 1: Appearance
    expect(html).toContain("界面外观");
    expect(html).toContain("浅色模式");
    expect(html).toContain("深色模式");
    expect(html).toContain("跟随系统");

    // Check Section 2: Calendar
    expect(html).toContain("日历视图显示设置");
    expect(html).toContain("周视图时间轴（每日计划详表）");
    expect(html).toContain("日视图时间轴");
    expect(html).toContain("月视图显示上限");
    expect(html).toContain("保存日历设置");

    // Check Section 3: Pomodoro
    expect(html).toContain("专注番茄钟设置");
    expect(html).toContain("经典番茄");
    expect(html).toContain("深度专注");
    expect(html).toContain("敏捷冲刺");
    expect(html).toContain("保存番茄钟设置");

    // Check Section 4: AI Assistant
    expect(html).toContain("AI 任务助理配置");
    expect(html).toContain("添加服务商");
    expect(html).toContain("测试连通性");
    expect(html).toContain("保存 AI 配置");
    expect(html).toContain("Anthropic Claude");
    expect(html).toContain("Google Gemini");
    expect(html).toContain("GLM (智谱 AI)");
    expect(html).toContain("Kimi (Moonshot)");
    expect(html).not.toContain("自定义 (OpenAI 兼容)");
    expect(html).not.toContain("自定义提供商");

    // Check Section 5: Data & WebDAV
    expect(html).toContain("WebDAV 云端同步");
    expect(html).toContain("本地快照与迁移");
    expect(html).toContain("导出 JSON 快照");
    expect(html).toContain("导入 JSON 快照");
    expect(html).toContain("危险区域");
    expect(html).toContain("清空数据并重置");
  });
});
