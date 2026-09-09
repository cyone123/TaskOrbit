import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Badge,
  ExtendedFab,
  SearchBar,
  SectionHeader,
  StatCard,
  isEventInsideDialogElement,
  shouldAllowDialogCancel,
} from "./ui";

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

  describe("Dialog outside-click protection", () => {
    it("recognizes pointer event inside dialog via bounding rect", () => {
      const mockContainer = {
        getBoundingClientRect: () => ({
          left: 100,
          right: 500,
          top: 100,
          bottom: 400,
          width: 400,
          height: 300,
        }),
      };
      const mockDialogEl = {
        shadowRoot: {
          querySelector: (selector: string) =>
            selector === ".container" ? mockContainer : null,
        },
        contains: () => false,
      } as unknown as HTMLElement;

      // Inside coordinates
      expect(
        isEventInsideDialogElement(mockDialogEl, {
          clientX: 200,
          clientY: 200,
        }),
      ).toBe(true);

      // Outside coordinates
      expect(
        isEventInsideDialogElement(mockDialogEl, {
          clientX: 50,
          clientY: 50,
        }),
      ).toBe(false);
    });

    it("recognizes pointer event inside dialog via composedPath", () => {
      const mockContainer = {
        getBoundingClientRect: () => ({
          left: 100,
          right: 500,
          top: 100,
          bottom: 400,
          width: 400,
          height: 300,
        }),
      };
      class MockNode {}
      const slottedContent = new MockNode() as unknown as Node;
      const mockDialogEl = {
        shadowRoot: {
          querySelector: (selector: string) =>
            selector === ".container" ? mockContainer : null,
        },
        contains: (target: unknown) => target === slottedContent,
      } as unknown as HTMLElement;

      // Event with slotted content in path
      expect(
        isEventInsideDialogElement(mockDialogEl, {
          clientX: 0,
          clientY: 0,
          composedPath: () => [slottedContent as unknown as EventTarget, mockDialogEl],
        }),
      ).toBe(true);

      // Event with container in path
      expect(
        isEventInsideDialogElement(mockDialogEl, {
          clientX: 0,
          clientY: 0,
          composedPath: () => [mockContainer as unknown as EventTarget],
        }),
      ).toBe(true);

      // Event with only external backdrop element in path
      expect(
        isEventInsideDialogElement(mockDialogEl, {
          clientX: 50,
          clientY: 50,
          composedPath: () => [{} as EventTarget],
        }),
      ).toBe(false);
    });

    it("shouldAllowDialogCancel prevents closing when mouse drag starts inside and ends outside", () => {
      // User started selecting text inside the dialog and released mouse outside
      const result = shouldAllowDialogCancel({
        isPointerInteraction: true,
        pointerDownStartedOutside: false,
        pointerUpEndedOutside: true,
      });
      expect(result).toBe(false);
    });

    it("shouldAllowDialogCancel allows closing on genuine outside click", () => {
      // User clicked on the backdrop (both pointerdown and pointerup outside)
      const result = shouldAllowDialogCancel({
        isPointerInteraction: true,
        pointerDownStartedOutside: true,
        pointerUpEndedOutside: true,
      });
      expect(result).toBe(true);
    });

    it("shouldAllowDialogCancel prevents closing when click starts outside and ends inside", () => {
      const result = shouldAllowDialogCancel({
        isPointerInteraction: true,
        pointerDownStartedOutside: true,
        pointerUpEndedOutside: false,
      });
      expect(result).toBe(false);
    });

    it("shouldAllowDialogCancel allows closing on non-pointer interactions like keyboard Escape", () => {
      const result = shouldAllowDialogCancel({
        isPointerInteraction: false,
        pointerDownStartedOutside: false,
        pointerUpEndedOutside: false,
      });
      expect(result).toBe(true);
    });
  });
});
