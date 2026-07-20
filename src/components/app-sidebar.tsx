"use client";

import { Bot, CalendarDays, Inbox, Search, Sparkles, Zap } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
};

const workspaceItems = [
  {
    title: "Agent",
    view: "agent" as const,
    icon: <Bot />,
    description: "Corsair MCP assistant",
  },
  {
    title: "Focus",
    view: "focus" as const,
    icon: <Sparkles />,
    description: "Inbox and schedule",
  },
  {
    title: "Inbox",
    view: "inbox" as const,
    icon: <Inbox />,
    description: "Gmail conversations",
  },
  {
    title: "Calendar",
    view: "calendar" as const,
    icon: <CalendarDays />,
    description: "Upcoming events",
  },
  {
    title: "Search",
    view: "search" as const,
    icon: <Search />,
    description: "Advanced Gmail search",
  },
];

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 items-center gap-2 overflow-hidden rounded-lg px-2">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Zap className="size-4" />
              </div>

              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">On Emit</span>
                <span className="text-sidebar-foreground/60 truncate text-xs">
                  Mail command center
                </span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={workspaceItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
