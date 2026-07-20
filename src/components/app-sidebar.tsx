"use client";

import type { LucideIcon } from "lucide-react";
import { Bot, CalendarDays, Inbox, Search, Sparkles, Zap } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  description: string;
  shortcut: string;
};

const workspaceItems: WorkspaceItem[] = [
  {
    title: "Focus",
    view: "focus",
    icon: Sparkles,
    description: "Priority mail and schedule at a glance",
    shortcut: "G F",
  },
  {
    title: "Inbox",
    view: "inbox",
    icon: Inbox,
    description: "Read and manage Gmail conversations",
    shortcut: "G I",
  },
  {
    title: "Calendar",
    view: "calendar",
    icon: CalendarDays,
    description: "Review events and meeting invitations",
    shortcut: "G C",
  },
  {
    title: "Search",
    view: "search",
    icon: Search,
    description: "Use Gmail advanced search operators",
    shortcut: "/",
  },
  {
    title: "Agent",
    view: "agent",
    icon: Bot,
    description: "Act through Gmail and Calendar with MCP",
    shortcut: "G A",
  },
];

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const activeView = useWorkspaceStore((state) => state.activeView);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setCommandPaletteOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );
  const { setOpen, setOpenMobile } = useSidebar();

  function openView(view: WorkspaceView) {
    setActiveView(view);
    setOpen(true);
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

                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        type="button"
                        tooltip={{ children: item.title, hidden: false }}
                        isActive={activeView === item.view}
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

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div>
            <p className="text-base font-semibold">On Emit</p>
            <p className="text-sidebar-foreground/60 text-xs">
              Gmail + Calendar command center
            </p>
          </div>

          <button
            type="button"
            className="border-sidebar-border bg-sidebar-accent/40 text-sidebar-foreground/70 hover:bg-sidebar-accent flex h-9 w-full items-center gap-2 rounded-md border px-3 text-left text-sm transition-colors"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search className="size-4" />
            <span>Search or run a command</span>
            <kbd className="border-sidebar-border bg-sidebar ml-auto rounded border px-1.5 py-0.5 font-mono text-[10px]">
              Ctrl K
            </kbd>
          </button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workflows</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {workspaceItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        type="button"
                        size="lg"
                        isActive={activeView === item.view}
                        className="h-auto items-start gap-3 px-3 py-2.5"
                        onClick={() => openView(item.view)}
                      >
                        <span className="bg-sidebar-accent flex size-8 shrink-0 items-center justify-center rounded-lg">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium">
                            {item.title}
                          </span>
                          <span className="text-sidebar-foreground/60 block truncate text-xs">
                            {item.description}
                          </span>
                        </span>
                        <kbd className="text-sidebar-foreground/45 mt-0.5 font-mono text-[10px]">
                          {item.shortcut}
                        </kbd>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-4">
          <div className="bg-sidebar-accent/50 rounded-lg border p-3">
            <p className="text-xs font-medium">Corsair workspace</p>
            <p className="text-sidebar-foreground/60 mt-1 text-xs leading-relaxed">
              Gmail and Google Calendar actions stay isolated to your Supabase
              account.
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>
    </Sidebar>
  );
}
