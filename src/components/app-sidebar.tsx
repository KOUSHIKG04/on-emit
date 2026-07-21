"use client";

import { useEffect, useRef, useState } from "react";
import type { TablerIcon } from "@/components/icons";
import {
  Bot,
  CalendarDays,
  Inbox,
  Search,
  Settings2,
  Sparkles,
  Zap,
} from "@/components/icons";

import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { GmailSearch } from "@/components/mail/gmail-search";
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
import { cn } from "@/lib/utils";
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
  icon: TablerIcon;
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
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const { open, setOpen, setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpen(
      activeView === "inbox" ||
        activeView === "calendar" ||
        activeView === "search",
    );
  }, [activeView, setOpen]);

  function openView(view: WorkspaceView) {
    if (view === "agent") {
      setOpen(false);
      setOpenMobile(false);
      setAgentPanelOpen(true);
      return;
    }

    setActiveView(view);
    setOpen(
      view === "inbox" || view === "calendar" || view === "search",
    );
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
        <SidebarHeader className="h-16 shrink-0 justify-center border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="justify-center md:h-10 md:p-0 group-data-[collapsible=icon]:w-full!"
                tooltip={{ children: "On Emit", hidden: false }}
                onClick={() => openView("focus")}
              >
                <div className="bg-amber-400 text-amber-950 flex size-7 items-center justify-center rounded-lg shadow-sm">
                  <Zap className="size-4 fill-current" />
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {workspaceItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeView === item.view;

                  return (
                    <SidebarMenuItem key={item.view}>
                      <SidebarMenuButton
                        aria-pressed={active}
                        className={cn(
                          "justify-center md:h-10 md:p-0 group-data-[collapsible=icon]:w-full!",
                          active &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs",
                        )}
                        tooltip={{ children: item.title, hidden: false }}
                        onClick={() => openView(item.view)}
                      >
                        <Icon className="size-4" />
                        <span className="sr-only">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        collapsible="none"
        className="flex-1 overflow-hidden"
        style={{
          width: open ? `${sidebarWidth}px` : 0,
        }}
      >
        {activeView === "inbox" ? <InboxPanel variant="sidebar" /> : null}
        {activeView === "calendar" ? (
          <CalendarSidebar accountEmail={user.email} />
        ) : null}
        {activeView === "search" ? <GmailSearch variant="panel" /> : null}
      </Sidebar>

      {open &&
      (activeView === "inbox" ||
        activeView === "calendar" ||
        activeView === "search") ? (
        <SidebarResizeHandle />
      ) : null}
    </Sidebar>
  );
}

const MIN_SIDEBAR_WIDTH = 384;
const DEFAULT_SIDEBAR_WIDTH = 448;
const MAX_SIDEBAR_WIDTH = 640;

function SidebarResizeHandle() {
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const setSidebarWidth = useWorkspaceStore((state) => state.setSidebarWidth);
  const [resizing, setResizing] = useState(false);
  const dragStart = useRef({ pointerX: 0, width: sidebarWidth });

  function clampWidth(width: number) {
    const viewportMaximum =
      typeof window === "undefined"
        ? MAX_SIDEBAR_WIDTH
        : Math.floor(window.innerWidth * 0.62);

    return Math.min(
      Math.max(MIN_SIDEBAR_WIDTH, viewportMaximum),
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, width),
    );
  }

  return (
    <div
      role="separator"
      aria-label="Resize sidebar"
      aria-orientation="vertical"
      aria-valuemin={MIN_SIDEBAR_WIDTH}
      aria-valuemax={MAX_SIDEBAR_WIDTH}
      aria-valuenow={sidebarWidth}
      tabIndex={0}
      className={cn(
        "group/resize absolute inset-y-0 right-0 z-50 hidden w-2 cursor-col-resize touch-none md:block",
        resizing && "bg-primary/10",
      )}
      onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setSidebarWidth(clampWidth(sidebarWidth + direction * 16));
      }}
      onPointerDown={(event) => {
        dragStart.current = {
          pointerX: event.clientX,
          width: sidebarWidth,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        setResizing(true);
      }}
      onPointerMove={(event) => {
        if (!resizing) return;

        const delta = event.clientX - dragStart.current.pointerX;
        setSidebarWidth(clampWidth(dragStart.current.width + delta));
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setResizing(false);
      }}
      onPointerCancel={() => setResizing(false)}
    >
      <span className="bg-border group-hover/resize:bg-primary group-focus/resize:bg-primary absolute inset-y-0 right-0 w-px transition-colors" />
    </div>
  );
}
