"use client";

import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import type { WorkspaceView } from "@/stores/workspace-store";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  view: WorkspaceView;
  icon: React.ReactNode;
  description: string;
};

export function NavMain({ items }: { items: NavItem[] }) {
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>

      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.view}>
            <SidebarMenuButton
              type="button"
              tooltip={item.description}
              isActive={activeView === item.view}
              onClick={() => setActiveView(item.view)}
            >
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
