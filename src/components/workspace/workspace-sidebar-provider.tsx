"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const effectiveSidebarWidth = pathname === "/agent" ? 410 : sidebarWidth;

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${effectiveSidebarWidth}px`,
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
