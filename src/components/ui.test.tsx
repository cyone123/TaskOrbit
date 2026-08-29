import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Badge, ExtendedFab, SearchBar, SectionHeader, StatCard } from "./ui";

describe("MD3 Base Components", () => {
  it("renders ExtendedFab with proper classes and label", () => {
    const html = renderToStaticMarkup(
      <ExtendedFab label="新建任务" icon="add" variant="primary" />
    );
    expect(html).toContain("extended-fab");
    expect(html).toContain("extended-fab--primary");
    expect(html).toContain("新建任务");
    expect(html).toContain("add");
  });

  it("renders SearchBar with input and placeholder", () => {
    const html = renderToStaticMarkup(
      <SearchBar value="测试搜索" onChange={() => {}} placeholder="搜索项目..." />
    );
    expect(html).toContain("search-bar");
    expect(html).toContain('value="测试搜索"');
    expect(html).toContain('placeholder="搜索项目..."');
  });

  it("renders StatCard with KPI metric and icon", () => {
    const html = renderToStaticMarkup(
      <StatCard
        title="整体进度"
        value="85"
        unit="%"
        subtitle="任务完成率"
        icon="trending_up"
        colorVariant="success"
      />
    );
    expect(html).toContain("stat-card");
    expect(html).toContain("stat-card--success");
    expect(html).toContain("整体进度");
    expect(html).toContain("85");
    expect(html).toContain("%");
    expect(html).toContain("trending_up");
  });

  it("renders Badge in dot and pill mode", () => {
    const pillHtml = renderToStaticMarkup(<Badge value={5} variant="error" />);
    expect(pillHtml).toContain("badge--pill");
    expect(pillHtml).toContain("badge--error");
    expect(pillHtml).toContain("5");

    const dotHtml = renderToStaticMarkup(<Badge dot variant="primary" />);
    expect(dotHtml).toContain("badge--dot");
    expect(dotHtml).toContain("badge--primary");
  });

  it("renders SectionHeader with title and actions", () => {
    const html = renderToStaticMarkup(
      <SectionHeader
        title="项目概览"
        subtitle="今日关键数据"
        badge={<Badge value="新" variant="secondary" />}
      />
    );
    expect(html).toContain("section-header");
    expect(html).toContain("项目概览");
    expect(html).toContain("今日关键数据");
    expect(html).toContain("badge");
  });
});
