"use client";

import type { ReactNode } from "react";

import { SidebarProvider } from "@/components/ui/sidebar";
export function WorkspaceSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "clamp(24rem, 32vw, 31rem)",
        } as React.CSSProperties
      }
    >
      {children}
    </SidebarProvider>
  );
}
