"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import type { StoreApi } from "zustand/vanilla";
import {
  createWorkspaceStore,
  type WorkspaceState,
  type WorkspaceStore,
} from "@/stores/workspace-store";

type WorkspaceStoreContextValue = StoreApi<WorkspaceStore>;

const WorkspaceStoreContext = createContext<WorkspaceStoreContextValue | null>(
  null,
);

type WorkspaceStoreProviderProps = {
  children: ReactNode;
  initialState?: WorkspaceState;
};

export function WorkspaceStoreProvider({
  children,
  initialState,
}: WorkspaceStoreProviderProps) {
  const storeRef = useRef<WorkspaceStoreContextValue | null>(null);

  storeRef.current ??= createWorkspaceStore(initialState);

  return (
    <WorkspaceStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkspaceStoreContext.Provider>
  );
}

export function useWorkspaceStore<T>(
  selector: (store: WorkspaceStore) => T,
): T {
  const store = useContext(WorkspaceStoreContext);

  if (!store) {
    throw new Error(
      "useWorkspaceStore must be used inside WorkspaceStoreProvider",
    );
  }

  return useStore(store, selector);
}
