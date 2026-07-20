"use client";

import type { ReactNode } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const activeView = useWorkspaceStore((state) => state.activeView);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width":
            activeView === "calendar"
              ? "22rem"
              : "clamp(24rem, 32vw, 31rem)",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
