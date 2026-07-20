import { createStore } from "zustand/vanilla";

export type WorkspaceView =
  | "focus"
  | "inbox"
  | "search"
  | "calendar"
  | "agent"
  | "settings";

export type CalendarView = "month" | "week" | "day";

export type WorkspaceState = {
  activeView: WorkspaceView;
  selectedThreadId: string | null;
  commandPaletteOpen: boolean;
  composerOpen: boolean;
  agentPanelOpen: boolean;
  calendarDate: string;
  calendarView: CalendarView;
  primaryCalendarVisible: boolean;
  sidebarCollapsed: boolean;
};

export type WorkspaceActions = {
  setActiveView: (view: WorkspaceView) => void;
  selectThread: (threadId: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setComposerOpen: (open: boolean) => void;
  setAgentPanelOpen: (open: boolean) => void;
  setCalendarDate: (date: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setPrimaryCalendarVisible: (visible: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  closeOverlays: () => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

function getLocalDateKey() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const defaultWorkspaceState: WorkspaceState = {
  activeView: "focus",
  selectedThreadId: null,
  commandPaletteOpen: false,
  composerOpen: false,
  agentPanelOpen: false,
  calendarDate: getLocalDateKey(),
  calendarView: "month",
  primaryCalendarVisible: true,
  sidebarCollapsed: false,
};

export function createWorkspaceStore(
  initialState: WorkspaceState = defaultWorkspaceState,
) {
  return createStore<WorkspaceStore>()((set) => ({
    ...initialState,

    setActiveView: (activeView) => {
      set({ activeView });
    },

    selectThread: (selectedThreadId) => {
      set({ selectedThreadId });
    },

    setCommandPaletteOpen: (commandPaletteOpen) => {
      set({ commandPaletteOpen });
    },

    setComposerOpen: (composerOpen) => {
      set({ composerOpen });
    },

    setAgentPanelOpen: (agentPanelOpen) => {
      set({ agentPanelOpen });
    },

    setCalendarDate: (calendarDate) => {
      set({ calendarDate });
    },

    setCalendarView: (calendarView) => {
      set({ calendarView });
    },

    setPrimaryCalendarVisible: (primaryCalendarVisible) => {
      set({ primaryCalendarVisible });
    },

    setSidebarCollapsed: (sidebarCollapsed) => {
      set({ sidebarCollapsed });
    },

    closeOverlays: () => {
      set({
        commandPaletteOpen: false,
        composerOpen: false,
        agentPanelOpen: false,
      });
    },
  }));
}
