import { createStore } from "zustand/vanilla";

export type CalendarView = "month" | "week" | "day";
export type QuickActionMode = "email" | "event";
export type InboxLabelFilter = "all" | "unread" | "read";
export type AgentConversationSummary = {
  id: string;
  title: string;
  updatedAt: number;
};
export type AgentChatCommand =
  | { id: number; type: "create" }
  | { id: number; type: "delete"; conversationId: string };

export type WorkspaceState = {
  selectedThreadId: string | null;
  selectedSearchThreadId: string | null;
  commandPaletteOpen: boolean;
  quickActionMode: QuickActionMode;
  composerOpen: boolean;
  agentDraft: string;
  agentConversationSummaries: AgentConversationSummary[];
  activeAgentConversationId: string | null;
  agentChatCommand: AgentChatCommand | null;
  calendarDate: string;
  calendarView: CalendarView;
  primaryCalendarVisible: boolean;
  inboxLabelFilter: InboxLabelFilter;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
};

export type WorkspaceActions = {
  selectThread: (threadId: string | null) => void;
  selectSearchThread: (threadId: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setQuickActionMode: (mode: QuickActionMode) => void;
  setComposerOpen: (open: boolean) => void;
  setAgentDraft: (draft: string) => void;
  setAgentConversationSummaries: (
    summaries: AgentConversationSummary[],
  ) => void;
  setActiveAgentConversationId: (conversationId: string | null) => void;
  requestNewAgentChat: () => void;
  requestDeleteAgentChat: (conversationId: string) => void;
  clearAgentChatCommand: (commandId: number) => void;
  setCalendarDate: (date: string) => void;
  setCalendarView: (view: CalendarView) => void;
  setPrimaryCalendarVisible: (visible: boolean) => void;
  setInboxLabelFilter: (filter: InboxLabelFilter) => void;
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

function getLocalDateKey() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const defaultWorkspaceState: WorkspaceState = {
  selectedThreadId: null,
  selectedSearchThreadId: null,
  commandPaletteOpen: false,
  quickActionMode: "email",
  composerOpen: false,
  agentDraft: "",
  agentConversationSummaries: [],
  activeAgentConversationId: null,
  agentChatCommand: null,
  calendarDate: getLocalDateKey(),
  calendarView: "month",
  primaryCalendarVisible: true,
  inboxLabelFilter: "all",
  sidebarWidth: 448,
  sidebarCollapsed: false,
};

export function createWorkspaceStore(
  initialState: WorkspaceState = defaultWorkspaceState,
) {
  return createStore<WorkspaceStore>()((set) => ({
    ...initialState,

    selectThread: (selectedThreadId) => {
      set({ selectedThreadId });
    },

    selectSearchThread: (selectedSearchThreadId) => {
      set({ selectedSearchThreadId });
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

    setAgentDraft: (agentDraft) => {
      set({ agentDraft });
    },

    setAgentConversationSummaries: (agentConversationSummaries) => {
      set({ agentConversationSummaries });
    },

    setActiveAgentConversationId: (activeAgentConversationId) => {
      set({ activeAgentConversationId });
    },

    requestNewAgentChat: () => {
      set((state) => ({
        agentChatCommand: {
          id: (state.agentChatCommand?.id ?? 0) + 1,
          type: "create",
        },
      }));
    },

    requestDeleteAgentChat: (conversationId) => {
      set((state) => ({
        agentChatCommand: {
          id: (state.agentChatCommand?.id ?? 0) + 1,
          type: "delete",
          conversationId,
        },
      }));
    },

    clearAgentChatCommand: (commandId) => {
      set((state) =>
        state.agentChatCommand?.id === commandId
          ? { agentChatCommand: null }
          : state,
      );
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

    setSidebarWidth: (sidebarWidth) => {
      set({ sidebarWidth });
    },

    setSidebarCollapsed: (sidebarCollapsed) => {
      set({ sidebarCollapsed });
    },
  }));
}
