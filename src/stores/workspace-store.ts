import { createStore } from "zustand/vanilla";

export type WorkspaceView =
  | "focus"
  | "inbox"
  | "search"
  | "calendar"
  | "agent"
  | "settings";

export type CalendarView = "month" | "week" | "day";
export type QuickActionMode = "email" | "event";
export type InboxLabelFilter = "all" | "unread" | "read";

export type WorkspaceState = {
  activeView: WorkspaceView;
  selectedThreadId: string | null;
  commandPaletteOpen: boolean;
  quickActionMode: QuickActionMode;
  composerOpen: boolean;
  agentPanelOpen: boolean;
  agentDraft: string;
  calendarDate: string;
  calendarView: CalendarView;
  primaryCalendarVisible: boolean;
  inboxLabelFilter: InboxLabelFilter;
  sidebarCollapsed: boolean;
};

export type WorkspaceActions = {
  setActiveView: (view: WorkspaceView) => void;
  selectThread: (threadId: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickActionMode: (mode: QuickActionMode) => void;
  setComposerOpen: (open: boolean) => void;
  setAgentPanelOpen: (open: boolean) => void;
  setAgentDraft: (draft: string) => void;
  setCalendarDate: (date: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setPrimaryCalendarVisible: (visible: boolean) => void;
  setInboxLabelFilter: (filter: InboxLabelFilter) => void;
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
  quickActionMode: "email",
  composerOpen: false,
  agentPanelOpen: false,
  agentDraft: "",
  calendarDate: getLocalDateKey(),
  calendarView: "month",
  primaryCalendarVisible: true,
  inboxLabelFilter: "all",
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

    setQuickActionMode: (quickActionMode) => {
      set({ quickActionMode });
    },

    setComposerOpen: (composerOpen) => {
      set({ composerOpen });
    },

    setAgentPanelOpen: (agentPanelOpen) => {
      set({ agentPanelOpen });
    },

    setAgentDraft: (agentDraft) => {
      set({ agentDraft });
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

    setInboxLabelFilter: (inboxLabelFilter) => {
      set({ inboxLabelFilter });
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
