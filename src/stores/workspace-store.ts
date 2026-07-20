import { createStore } from "zustand/vanilla";

export type WorkspaceView = "focus" | "inbox" | "search" | "calendar" | "agent";

export type WorkspaceState = {
  activeView: WorkspaceView;
  selectedThreadId: string | null;
  commandPaletteOpen: boolean;
  composerOpen: boolean;
  agentPanelOpen: boolean;
  sidebarCollapsed: boolean;
};

export type WorkspaceActions = {
  setActiveView: (view: WorkspaceView) => void;
  selectThread: (threadId: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setComposerOpen: (open: boolean) => void;
  setAgentPanelOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  closeOverlays: () => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const defaultWorkspaceState: WorkspaceState = {
  activeView: "focus",
  selectedThreadId: null,
  commandPaletteOpen: false,
  composerOpen: false,
  agentPanelOpen: false,
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
