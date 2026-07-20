"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CalendarDays,
  Inbox,
  Search,
  Settings2,
  Sparkles,
  Zap,
} from "lucide-react";

import { InboxPanel } from "@/components/mail/inbox-panel";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import type { WorkspaceView } from "@/stores/workspace-store";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
};

type WorkspaceItem = {
  title: string;
  view: WorkspaceView;
  icon: LucideIcon;
};

const workspaceItems: WorkspaceItem[] = [
  { title: "Focus", view: "focus", icon: Sparkles },
  { title: "Inbox", view: "inbox", icon: Inbox },
  { title: "Calendar", view: "calendar", icon: CalendarDays },
  { title: "Search", view: "search", icon: Search },
  { title: "Agent", view: "agent", icon: Bot },
  { title: "Settings", view: "settings", icon: Settings2 },
];

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setAgentPanelOpen = useWorkspaceStore(
    (state) => state.setAgentPanelOpen,
  );
  const agentPanelOpen = useWorkspaceStore((state) => state.agentPanelOpen);
  const { setOpen, setOpenMobile } = useSidebar();

  function openView(view: WorkspaceView) {
    if (view === "agent") {
      setOpen(false);
      setOpenMobile(false);
      setAgentPanelOpen(true);
      return;
    }

    setActiveView(view);
    setOpen(view === "inbox");
    setOpenMobile(false);
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                tooltip={{ children: "On Emit", hidden: false }}
                onClick={() => openView("focus")}
              >
                <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Zap className="size-4" />
                </span>
                <span className="sr-only">Open On Emit focus workspace</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  const isAgent = item.view === "agent";

                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        type="button"
                        tooltip={{ children: item.title, hidden: false }}
                        isActive={
                          isAgent ? agentPanelOpen : activeView === item.view
                        }
                        className="px-2.5 md:px-2"
                        onClick={() => openView(item.view)}
                      >
                        <Icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} compact />
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        collapsible="none"
        className="hidden min-w-0 flex-1 overflow-hidden md:flex"
      >
        {activeView === "inbox" ? <InboxPanel variant="sidebar" /> : null}
      </Sidebar>
    </Sidebar>
  );
}
