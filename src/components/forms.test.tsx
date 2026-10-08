import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createProject } from "@task-orbit/core";
import { ProjectForm, TaskForm } from "./forms";

describe("ProjectForm", () => {
  it("renders preset color options and custom palette option", () => {
    const html = renderToStaticMarkup(
      <ProjectForm
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    // Preset color buttons
    expect(html).toContain('title="紫罗兰"');
    expect(html).toContain('title="蓝色"');

    // Palette custom color button
    expect(html).toContain("color-dot--custom");
    expect(html).toContain("自定义颜色（调色盘）");
    expect(html).toContain('type="color"');
    expect(html).toContain("palette");
  });

  it("renders custom color as selected when initial project has custom color", () => {
    const project = createProject({
      name: "测试项目",
      description: "描述",
      color: "#E91E63",
      startDate: "2026-10-01",
      endDate: "2026-10-15",
    });

    const html = renderToStaticMarkup(
      <ProjectForm
        initial={project}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain("color-dot--custom selected");
    expect(html).toContain("#E91E63");
    expect(html).toContain('value="#e91e63"');
  });

  it("renders DatePicker for project startDate and endDate", () => {
    const html = renderToStaticMarkup(
      <ProjectForm
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain("开始日期");
    expect(html).toContain("结束日期");
    expect(html).toContain("calendar_today");
  });
});

describe("TaskForm", () => {
  it("renders no-schedule checkbox and associated label", () => {
    const html = renderToStaticMarkup(
      <TaskForm
        projectId="p1"
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );

    expect(html).toContain('id="task-no-schedule"');
    expect(html).toContain('for="task-no-schedule"');
    expect(html).toContain("暂不排期（进入待处理）");
  });
});
