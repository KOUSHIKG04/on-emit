"use client";

import type { ReactNode } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
