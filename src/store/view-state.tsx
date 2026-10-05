import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseISODate, toISODate, todayISO, type ViewKey } from "@task-orbit/core";

export type ProjectTabKey = "overview" | "tasks" | "stats" | "notes";
export type OverviewTaskViewMode = "kanban" | "list";

export interface InstantNoteTarget {
  type: "task" | "plan";
  id: string;
}

export interface ProjectsViewState {
  selectedProjectId: string | null;
  activeTab: ProjectTabKey;
  overviewTaskViewMode: OverviewTaskViewMode;
  searchQuery: string;
  showArchived: boolean;
  planDate: string;
  expandedTasks: Set<string>;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  activeNoteTarget: InstantNoteTarget | null;
  detailScrollTop: number;
}

export type CalendarModeKey = "month" | "week" | "day";
export type WeekViewModeKey = "gantt" | "detail";
export type MonthViewFilterKey = "all" | "tasks" | "plans";

export interface CalendarViewState {
  mode: CalendarModeKey;
  weekView: WeekViewModeKey;
  monthFilter: MonthViewFilterKey;
  anchorISO: string;
}

export type InboxFilterKey = "all" | "todo" | "note";

export interface InboxViewState {
  mode: "todo" | "note";
  filter: InboxFilterKey;
  draft: string;
}

export type SettingsTabKey = "all" | "appearance" | "calendar" | "pomodoro" | "ai" | "data";

export interface SettingsViewState {
  activeTab: SettingsTabKey;
}

export interface StatsViewState {
  selectedDay: string | null;
}

export interface DesktopViewState {
  currentView: ViewKey;
  projects: ProjectsViewState;
  calendar: CalendarViewState;
  inbox: InboxViewState;
  settings: SettingsViewState;
  stats: StatsViewState;
}

export interface PersistedViewState {
  currentView?: ViewKey;
  projects?: {
    selectedProjectId?: string | null;
    activeTab?: ProjectTabKey;
    overviewTaskViewMode?: OverviewTaskViewMode;
    searchQuery?: string;
    showArchived?: boolean;
    planDate?: string;
    expandedTasks?: string[];
    leftSidebarCollapsed?: boolean;
    rightSidebarCollapsed?: boolean;
    activeNoteTarget?: InstantNoteTarget | null;
    detailScrollTop?: number;
  };
  calendar?: {
    mode?: CalendarModeKey;
    weekView?: WeekViewModeKey;
    monthFilter?: MonthViewFilterKey;
    anchorISO?: string;
  };
  inbox?: {
    mode?: "todo" | "note";
    filter?: InboxFilterKey;
    draft?: string;
  };
  settings?: {
    activeTab?: SettingsTabKey;
  };
  stats?: {
    selectedDay?: string | null;
  };
}

export const VIEW_STATE_STORAGE_KEY = "task-orbit-desktop-view-state";

export const DEFAULT_VIEW_STATE: DesktopViewState = {
  currentView: "projects",
  projects: {
    selectedProjectId: null,
    activeTab: "overview",
    overviewTaskViewMode: "kanban",
    searchQuery: "",
    showArchived: false,
    planDate: todayISO(),
    expandedTasks: new Set<string>(),
    leftSidebarCollapsed: false,
    rightSidebarCollapsed: false,
    activeNoteTarget: null,
    detailScrollTop: 0,
  },
  calendar: {
    mode: "week",
    weekView: "gantt",
    monthFilter: "all",
    anchorISO: todayISO(),
  },
  inbox: {
    mode: "todo",
    filter: "all",
    draft: "",
  },
  settings: {
    activeTab: "all",
  },
  stats: {
    selectedDay: null,
  },
};

export function loadSavedViewState(): DesktopViewState {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_VIEW_STATE;
  }
  try {
    const raw = window.localStorage.getItem(VIEW_STATE_STORAGE_KEY);
    if (!raw) return DEFAULT_VIEW_STATE;
    const parsed = JSON.parse(raw) as PersistedViewState;
    return {
      currentView: parsed.currentView ?? DEFAULT_VIEW_STATE.currentView,
      projects: {
        selectedProjectId: parsed.projects?.selectedProjectId ?? null,
        activeTab: parsed.projects?.activeTab ?? "overview",
        overviewTaskViewMode: parsed.projects?.overviewTaskViewMode ?? "kanban",
        searchQuery: parsed.projects?.searchQuery ?? "",
        showArchived: parsed.projects?.showArchived ?? false,
        planDate: parsed.projects?.planDate ?? todayISO(),
        expandedTasks: new Set(parsed.projects?.expandedTasks ?? []),
        leftSidebarCollapsed: parsed.projects?.leftSidebarCollapsed ?? false,
        rightSidebarCollapsed: parsed.projects?.rightSidebarCollapsed ?? false,
        activeNoteTarget: parsed.projects?.activeNoteTarget ?? null,
        detailScrollTop: parsed.projects?.detailScrollTop ?? 0,
      },
      calendar: {
        mode: parsed.calendar?.mode ?? "week",
        weekView: parsed.calendar?.weekView ?? "gantt",
        monthFilter: parsed.calendar?.monthFilter ?? "all",
        anchorISO: parsed.calendar?.anchorISO ?? todayISO(),
      },
      inbox: {
        mode: parsed.inbox?.mode ?? "todo",
        filter: parsed.inbox?.filter ?? "all",
        draft: parsed.inbox?.draft ?? "",
      },
      settings: {
        activeTab: parsed.settings?.activeTab ?? "all",
      },
      stats: {
        selectedDay: parsed.stats?.selectedDay ?? null,
      },
    };
  } catch {
    return DEFAULT_VIEW_STATE;
  }
}

export function serializeViewState(state: DesktopViewState): string {
  const persisted: PersistedViewState = {
    currentView: state.currentView,
    projects: {
      selectedProjectId: state.projects.selectedProjectId,
      activeTab: state.projects.activeTab,
      overviewTaskViewMode: state.projects.overviewTaskViewMode,
      searchQuery: state.projects.searchQuery,
      showArchived: state.projects.showArchived,
      planDate: state.projects.planDate,
      expandedTasks: Array.from(state.projects.expandedTasks),
      leftSidebarCollapsed: state.projects.leftSidebarCollapsed,
      rightSidebarCollapsed: state.projects.rightSidebarCollapsed,
      activeNoteTarget: state.projects.activeNoteTarget,
      detailScrollTop: state.projects.detailScrollTop,
    },
    calendar: {
      mode: state.calendar.mode,
      weekView: state.calendar.weekView,
      monthFilter: state.calendar.monthFilter,
      anchorISO: state.calendar.anchorISO,
    },
    inbox: {
      mode: state.inbox.mode,
      filter: state.inbox.filter,
      draft: state.inbox.draft,
    },
    settings: {
      activeTab: state.settings.activeTab,
    },
    stats: {
      selectedDay: state.stats.selectedDay,
    },
  };
  return JSON.stringify(persisted);
}

export interface ViewStateContextValue {
  viewState: DesktopViewState;
  setCurrentView: (view: ViewKey | ((prev: ViewKey) => ViewKey)) => void;
  updateProjects: (
    updater:
      | Partial<ProjectsViewState>
      | ((prev: ProjectsViewState) => ProjectsViewState),
  ) => void;
  updateCalendar: (
    updater:
      | Partial<CalendarViewState>
      | ((prev: CalendarViewState) => CalendarViewState),
  ) => void;
  updateInbox: (
    updater:
      | Partial<InboxViewState>
      | ((prev: InboxViewState) => InboxViewState),
  ) => void;
  updateSettings: (
    updater:
      | Partial<SettingsViewState>
      | ((prev: SettingsViewState) => SettingsViewState),
  ) => void;
  updateStats: (
    updater:
      | Partial<StatsViewState>
      | ((prev: StatsViewState) => StatsViewState),
  ) => void;
}

const ViewStateContext = createContext<ViewStateContextValue | null>(null);

export function ViewStateProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: DesktopViewState;
}) {
  const [viewState, setViewState] = useState<DesktopViewState>(() => initialState ?? loadSavedViewState());
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(VIEW_STATE_STORAGE_KEY, serializeViewState(viewState));
      } catch {
        // Ignore localStorage write failure
      }
    }, 200);

    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [viewState]);

  const setCurrentView = useCallback(
    (val: ViewKey | ((prev: ViewKey) => ViewKey)) => {
      setViewState((prev) => ({
        ...prev,
        currentView: typeof val === "function" ? val(prev.currentView) : val,
      }));
    },
    [],
  );

  const updateProjects = useCallback(
    (
      updater:
        | Partial<ProjectsViewState>
        | ((prev: ProjectsViewState) => ProjectsViewState),
    ) => {
      setViewState((prev) => ({
        ...prev,
        projects:
          typeof updater === "function"
            ? updater(prev.projects)
            : { ...prev.projects, ...updater },
      }));
    },
    [],
  );

  const updateCalendar = useCallback(
    (
      updater:
        | Partial<CalendarViewState>
        | ((prev: CalendarViewState) => CalendarViewState),
    ) => {
      setViewState((prev) => ({
        ...prev,
        calendar:
          typeof updater === "function"
            ? updater(prev.calendar)
            : { ...prev.calendar, ...updater },
      }));
    },
    [],
  );

  const updateInbox = useCallback(
    (
      updater:
        | Partial<InboxViewState>
        | ((prev: InboxViewState) => InboxViewState),
    ) => {
      setViewState((prev) => ({
        ...prev,
        inbox:
          typeof updater === "function"
            ? updater(prev.inbox)
            : { ...prev.inbox, ...updater },
      }));
    },
    [],
  );

  const updateSettings = useCallback(
    (
      updater:
        | Partial<SettingsViewState>
        | ((prev: SettingsViewState) => SettingsViewState),
    ) => {
      setViewState((prev) => ({
        ...prev,
        settings:
          typeof updater === "function"
            ? updater(prev.settings)
            : { ...prev.settings, ...updater },
      }));
    },
    [],
  );

  const updateStats = useCallback(
    (
      updater:
        | Partial<StatsViewState>
        | ((prev: StatsViewState) => StatsViewState),
    ) => {
      setViewState((prev) => ({
        ...prev,
        stats:
          typeof updater === "function"
            ? updater(prev.stats)
            : { ...prev.stats, ...updater },
      }));
    },
    [],
  );

  const contextValue = useMemo<ViewStateContextValue>(
    () => ({
      viewState,
      setCurrentView,
      updateProjects,
      updateCalendar,
      updateInbox,
      updateSettings,
      updateStats,
    }),
    [
      viewState,
      setCurrentView,
      updateProjects,
      updateCalendar,
      updateInbox,
      updateSettings,
      updateStats,
    ],
  );

  return (
    <ViewStateContext.Provider value={contextValue}>
      {children}
    </ViewStateContext.Provider>
  );
}

export function useViewState() {
  const ctx = useContext(ViewStateContext);
  const [localView, setLocalView] = useState<ViewKey>("projects");
  if (!ctx) {
    return {
      currentView: localView,
      setCurrentView: setLocalView,
    };
  }
  return {
    currentView: ctx.viewState.currentView,
    setCurrentView: ctx.setCurrentView,
  };
}

export function useProjectsViewState() {
  const ctx = useContext(ViewStateContext);
  const [local, setLocal] = useState<ProjectsViewState>(DEFAULT_VIEW_STATE.projects);

  const state = ctx ? ctx.viewState.projects : local;
  const update = ctx
    ? ctx.updateProjects
    : (updater: Partial<ProjectsViewState> | ((prev: ProjectsViewState) => ProjectsViewState)) => {
        setLocal((prev) =>
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
        );
      };

  const setSelectedProjectId = useCallback(
    (val: string | null | ((prev: string | null) => string | null)) => {
      update((prev) => ({
        ...prev,
        selectedProjectId: typeof val === "function" ? val(prev.selectedProjectId) : val,
      }));
    },
    [update],
  );

  const setActiveTab = useCallback(
    (val: ProjectTabKey | ((prev: ProjectTabKey) => ProjectTabKey)) => {
      update((prev) => ({
        ...prev,
        activeTab: typeof val === "function" ? val(prev.activeTab) : val,
      }));
    },
    [update],
  );

  const setOverviewTaskViewMode = useCallback(
    (
      val:
        | OverviewTaskViewMode
        | ((prev: OverviewTaskViewMode) => OverviewTaskViewMode),
    ) => {
      update((prev) => ({
        ...prev,
        overviewTaskViewMode: typeof val === "function" ? val(prev.overviewTaskViewMode) : val,
      }));
    },
    [update],
  );

  const setSearchQuery = useCallback(
    (val: string | ((prev: string) => string)) => {
      update((prev) => ({
        ...prev,
        searchQuery: typeof val === "function" ? val(prev.searchQuery) : val,
      }));
    },
    [update],
  );

  const setShowArchived = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      update((prev) => ({
        ...prev,
        showArchived: typeof val === "function" ? val(prev.showArchived) : val,
      }));
    },
    [update],
  );

  const setPlanDate = useCallback(
    (val: string | ((prev: string) => string)) => {
      update((prev) => ({
        ...prev,
        planDate: typeof val === "function" ? val(prev.planDate) : val,
      }));
    },
    [update],
  );

  const setExpandedTasks = useCallback(
    (val: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      update((prev) => ({
        ...prev,
        expandedTasks: typeof val === "function" ? val(prev.expandedTasks) : val,
      }));
    },
    [update],
  );

  const setLeftSidebarCollapsed = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      update((prev) => ({
        ...prev,
        leftSidebarCollapsed: typeof val === "function" ? val(prev.leftSidebarCollapsed) : val,
      }));
    },
    [update],
  );

  const setRightSidebarCollapsed = useCallback(
    (val: boolean | ((prev: boolean) => boolean)) => {
      update((prev) => ({
        ...prev,
        rightSidebarCollapsed: typeof val === "function" ? val(prev.rightSidebarCollapsed) : val,
      }));
    },
    [update],
  );

  const setActiveNoteTarget = useCallback(
    (
      val:
        | InstantNoteTarget
        | null
        | ((prev: InstantNoteTarget | null) => InstantNoteTarget | null),
    ) => {
      update((prev) => ({
        ...prev,
        activeNoteTarget: typeof val === "function" ? val(prev.activeNoteTarget) : val,
      }));
    },
    [update],
  );

  const setDetailScrollTop = useCallback(
    (val: number | ((prev: number) => number)) => {
      update((prev) => ({
        ...prev,
        detailScrollTop: typeof val === "function" ? val(prev.detailScrollTop) : val,
      }));
    },
    [update],
  );

  return {
    selectedProjectId: state.selectedProjectId,
    setSelectedProjectId,
    activeTab: state.activeTab,
    setActiveTab,
    overviewTaskViewMode: state.overviewTaskViewMode,
    setOverviewTaskViewMode,
    searchQuery: state.searchQuery,
    setSearchQuery,
    showArchived: state.showArchived,
    setShowArchived,
    planDate: state.planDate,
    setPlanDate,
    expandedTasks: state.expandedTasks,
    setExpandedTasks,
    leftSidebarCollapsed: state.leftSidebarCollapsed,
    setLeftSidebarCollapsed,
    rightSidebarCollapsed: state.rightSidebarCollapsed,
    setRightSidebarCollapsed,
    activeNoteTarget: state.activeNoteTarget,
    setActiveNoteTarget,
    detailScrollTop: state.detailScrollTop,
    setDetailScrollTop,
  };
}

export function useCalendarViewState() {
  const ctx = useContext(ViewStateContext);
  const [local, setLocal] = useState<CalendarViewState>(DEFAULT_VIEW_STATE.calendar);

  const state = ctx ? ctx.viewState.calendar : local;
  const update = ctx
    ? ctx.updateCalendar
    : (updater: Partial<CalendarViewState> | ((prev: CalendarViewState) => CalendarViewState)) => {
        setLocal((prev) =>
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
        );
      };

  const setMode = useCallback(
    (val: CalendarModeKey | ((prev: CalendarModeKey) => CalendarModeKey)) => {
      update((prev) => ({
        ...prev,
        mode: typeof val === "function" ? val(prev.mode) : val,
      }));
    },
    [update],
  );

  const setWeekView = useCallback(
    (val: WeekViewModeKey | ((prev: WeekViewModeKey) => WeekViewModeKey)) => {
      update((prev) => ({
        ...prev,
        weekView: typeof val === "function" ? val(prev.weekView) : val,
      }));
    },
    [update],
  );

  const setMonthFilter = useCallback(
    (val: MonthViewFilterKey | ((prev: MonthViewFilterKey) => MonthViewFilterKey)) => {
      update((prev) => ({
        ...prev,
        monthFilter: typeof val === "function" ? val(prev.monthFilter) : val,
      }));
    },
    [update],
  );

  const anchor = useMemo(() => {
    try {
      return parseISODate(state.anchorISO);
    } catch {
      return new Date();
    }
  }, [state.anchorISO]);

  const setAnchor = useCallback(
    (val: Date | ((prev: Date) => Date)) => {
      update((prev) => {
        let current: Date;
        try {
          current = parseISODate(prev.anchorISO);
        } catch {
          current = new Date();
        }
        const next = typeof val === "function" ? val(current) : val;
        return {
          ...prev,
          anchorISO: toISODate(next),
        };
      });
    },
    [update],
  );

  return {
    mode: state.mode,
    setMode,
    weekView: state.weekView,
    setWeekView,
    monthFilter: state.monthFilter,
    setMonthFilter,
    anchor,
    setAnchor,
  };
}

export function useInboxViewState() {
  const ctx = useContext(ViewStateContext);
  const [local, setLocal] = useState<InboxViewState>(DEFAULT_VIEW_STATE.inbox);

  const state = ctx ? ctx.viewState.inbox : local;
  const update = ctx
    ? ctx.updateInbox
    : (updater: Partial<InboxViewState> | ((prev: InboxViewState) => InboxViewState)) => {
        setLocal((prev) =>
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
        );
      };

  const setMode = useCallback(
    (val: "todo" | "note" | ((prev: "todo" | "note") => "todo" | "note")) => {
      update((prev) => ({
        ...prev,
        mode: typeof val === "function" ? val(prev.mode) : val,
      }));
    },
    [update],
  );

  const setFilter = useCallback(
    (val: InboxFilterKey | ((prev: InboxFilterKey) => InboxFilterKey)) => {
      update((prev) => ({
        ...prev,
        filter: typeof val === "function" ? val(prev.filter) : val,
      }));
    },
    [update],
  );

  const setDraft = useCallback(
    (val: string | ((prev: string) => string)) => {
      update((prev) => ({
        ...prev,
        draft: typeof val === "function" ? val(prev.draft) : val,
      }));
    },
    [update],
  );

  return {
    mode: state.mode,
    setMode,
    filter: state.filter,
    setFilter,
    draft: state.draft,
    setDraft,
  };
}

export function useSettingsViewState() {
  const ctx = useContext(ViewStateContext);
  const [local, setLocal] = useState<SettingsViewState>(DEFAULT_VIEW_STATE.settings);

  const state = ctx ? ctx.viewState.settings : local;
  const update = ctx
    ? ctx.updateSettings
    : (updater: Partial<SettingsViewState> | ((prev: SettingsViewState) => SettingsViewState)) => {
        setLocal((prev) =>
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
        );
      };

  const setActiveTab = useCallback(
    (val: SettingsTabKey | ((prev: SettingsTabKey) => SettingsTabKey)) => {
      update((prev) => ({
        ...prev,
        activeTab: typeof val === "function" ? val(prev.activeTab) : val,
      }));
    },
    [update],
  );

  return {
    activeTab: state.activeTab,
    setActiveTab,
  };
}

export function useStatsViewState() {
  const ctx = useContext(ViewStateContext);
  const [local, setLocal] = useState<StatsViewState>(DEFAULT_VIEW_STATE.stats);

  const state = ctx ? ctx.viewState.stats : local;
  const update = ctx
    ? ctx.updateStats
    : (updater: Partial<StatsViewState> | ((prev: StatsViewState) => StatsViewState)) => {
        setLocal((prev) =>
          typeof updater === "function" ? updater(prev) : { ...prev, ...updater },
        );
      };

  const setSelectedDay = useCallback(
    (val: string | null | ((prev: string | null) => string | null)) => {
      update((prev) => ({
        ...prev,
        selectedDay: typeof val === "function" ? val(prev.selectedDay) : val,
      }));
    },
    [update],
  );

  return {
    selectedDay: state.selectedDay,
    setSelectedDay,
  };
}
