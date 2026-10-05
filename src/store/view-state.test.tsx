import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_VIEW_STATE,
  VIEW_STATE_STORAGE_KEY,
  ViewStateProvider,
  loadSavedViewState,
  serializeViewState,
  useCalendarViewState,
  useInboxViewState,
  useProjectsViewState,
  useSettingsViewState,
  useStatsViewState,
  useViewState,
} from "./view-state";

const values = new Map<string, string>();

const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value);
  },
  removeItem: (key: string) => {
    values.delete(key);
  },
  clear: () => {
    values.clear();
  },
  key: (index: number) => Array.from(values.keys())[index] ?? null,
  get length() {
    return values.size;
  },
};

describe("view-state store", () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("localStorage", storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads default view state when localStorage is empty", () => {
    const state = loadSavedViewState();
    expect(state.currentView).toBe("projects");
    expect(state.projects.selectedProjectId).toBeNull();
    expect(state.projects.activeTab).toBe("overview");
    expect(state.calendar.mode).toBe("week");
    expect(state.inbox.filter).toBe("all");
    expect(state.settings.activeTab).toBe("all");
    expect(state.stats.selectedDay).toBeNull();
  });

  it("serializes and deserializes view state correctly including Sets", () => {
    const customState = {
      ...DEFAULT_VIEW_STATE,
      currentView: "calendar" as const,
      projects: {
        ...DEFAULT_VIEW_STATE.projects,
        selectedProjectId: "proj-123",
        activeTab: "tasks" as const,
        expandedTasks: new Set(["task-1", "task-2"]),
      },
      calendar: {
        ...DEFAULT_VIEW_STATE.calendar,
        mode: "month" as const,
        anchorISO: "2026-11-01",
      },
    };

    const serialized = serializeViewState(customState);
    values.set(VIEW_STATE_STORAGE_KEY, serialized);

    const loaded = loadSavedViewState();
    expect(loaded.currentView).toBe("calendar");
    expect(loaded.projects.selectedProjectId).toBe("proj-123");
    expect(loaded.projects.activeTab).toBe("tasks");
    expect(Array.from(loaded.projects.expandedTasks)).toEqual(["task-1", "task-2"]);
    expect(loaded.calendar.mode).toBe("month");
    expect(loaded.calendar.anchorISO).toBe("2026-11-01");
  });

  it("gracefully falls back when localStorage contains corrupt JSON", () => {
    values.set(VIEW_STATE_STORAGE_KEY, "invalid-json{");
    const loaded = loadSavedViewState();
    expect(loaded).toEqual(DEFAULT_VIEW_STATE);
  });

  it("renders with ViewStateProvider and exposes current view", () => {
    function TestConsumer() {
      const { currentView } = useViewState();
      const { selectedProjectId, activeTab } = useProjectsViewState();
      const { mode, anchor } = useCalendarViewState();
      const { filter } = useInboxViewState();
      const { activeTab: settingsTab } = useSettingsViewState();
      const { selectedDay } = useStatsViewState();

      return (
        <div>
          <span data-testid="view">{currentView}</span>
          <span data-testid="project">{selectedProjectId ?? "none"}</span>
          <span data-testid="project-tab">{activeTab}</span>
          <span data-testid="calendar-mode">{mode}</span>
          <span data-testid="calendar-year">{anchor.getFullYear()}</span>
          <span data-testid="inbox-filter">{filter}</span>
          <span data-testid="settings-tab">{settingsTab}</span>
          <span data-testid="stats-day">{selectedDay ?? "none"}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(
      <ViewStateProvider
        initialState={{
          ...DEFAULT_VIEW_STATE,
          currentView: "calendar",
          projects: {
            ...DEFAULT_VIEW_STATE.projects,
            selectedProjectId: "proj-abc",
            activeTab: "notes",
          },
          calendar: {
            ...DEFAULT_VIEW_STATE.calendar,
            mode: "month",
            anchorISO: "2026-12-25",
          },
          inbox: {
            ...DEFAULT_VIEW_STATE.inbox,
            filter: "todo",
          },
          settings: {
            activeTab: "ai",
          },
          stats: {
            selectedDay: "2026-10-01",
          },
        }}
      >
        <TestConsumer />
      </ViewStateProvider>,
    );

    expect(html).toContain('data-testid="view">calendar<');
    expect(html).toContain('data-testid="project">proj-abc<');
    expect(html).toContain('data-testid="project-tab">notes<');
    expect(html).toContain('data-testid="calendar-mode">month<');
    expect(html).toContain('data-testid="calendar-year">2026<');
    expect(html).toContain('data-testid="inbox-filter">todo<');
    expect(html).toContain('data-testid="settings-tab">ai<');
    expect(html).toContain('data-testid="stats-day">2026-10-01<');
  });

  it("renders gracefully without ViewStateProvider (fallback behavior)", () => {
    function StandaloneConsumer() {
      const { currentView } = useViewState();
      const { selectedProjectId } = useProjectsViewState();
      const { mode } = useCalendarViewState();
      return (
        <div>
          <span>{currentView}</span>
          <span>{selectedProjectId ?? "default-none"}</span>
          <span>{mode}</span>
        </div>
      );
    }

    const html = renderToStaticMarkup(<StandaloneConsumer />);
    expect(html).toContain("projects");
    expect(html).toContain("default-none");
    expect(html).toContain("week");
  });
});
