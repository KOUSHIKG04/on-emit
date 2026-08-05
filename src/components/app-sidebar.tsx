"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { TablerIcon } from "@/components/icons";
import {
  ChartBar,
  Ghost2,
  CalendarDays,
  Inbox,
  Search,
  Settings,
  FocusCentered,
  Zap,
  X,
} from "@/components/icons";

import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { AgentSidebar } from "@/components/agent/agent-sidebar";
import { GmailSearch } from "@/components/mail/gmail-search";
import { InboxPanel } from "@/components/mail/inbox-panel";
import { NavUser } from "@/components/nav-user";
import { AnalyticsDrawerContent } from "@/components/workspace/analytics-bento";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  // SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string;
    email: string;
  };
};

type WorkspaceItem = {
  title: string;
  href: string;
  icon: TablerIcon;
};

const primaryItems: WorkspaceItem[] = [
  { title: "Focus", href: "/focus", icon: FocusCentered },
  { title: "Inbox", href: "/inbox", icon: Inbox },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Agent", href: "/agent", icon: Ghost2 },
];

const utilityItems: WorkspaceItem[] = [
  { title: "Advanced search", href: "/search", icon: Search },
  { title: "Settings", href: "/settings", icon: Settings },
];

const workspaceItems = [...primaryItems, ...utilityItems];

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const utils = api.useUtils();
  const sidebarWidth = useWorkspaceStore((state) => state.sidebarWidth);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const { open, setOpen, setOpenMobile } = useSidebar();
  const panelRoute =
    pathname === "/inbox" ||
    pathname === "/calendar" ||
    pathname === "/agent" ||
    pathname === "/search";

  useEffect(() => {
    setOpen(panelRoute);
  }, [panelRoute, setOpen]);

  useEffect(() => {
    for (const item of workspaceItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  function prepareNavigation(href: string) {
    setOpenMobile(false);
    if (href === pathname) return;

    setOpen(false);

    if (pathname === "/inbox") {
      void utils.gmail.inbox.cancel();
      void utils.gmail.drafts.cancel();
      void utils.gmail.archived.cancel();
    } else if (pathname === "/search") {
      void utils.gmail.search.cancel();
    } else if (pathname === "/calendar") {
      void utils.calendar.range.cancel();
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r max-md:w-full!"
      >
        <SidebarHeader className="h-16 shrink-0 justify-center border-b">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/focus" />}
                size="lg"
                tooltip="On Emit"
                tooltipAlways
                className="justify-center max-md:justify-start max-md:px-3 group-data-[collapsible=icon]:w-full! md:h-10 md:p-0"
                aria-label="On Emit"
                onClick={() => prepareNavigation("/focus")}
              >
                <div className="flex size-7 items-center justify-center rounded-lg bg-amber-400 text-amber-950 shadow-sm">
                  <Zap className="size-4 fill-current" />
                </div>
                <span className="sr-only max-md:not-sr-only ml-2 text-sm font-semibold tracking-tight">
                  On Emit
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {primaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.title}
                        tooltipAlways
                        className={cn(
                          "justify-center max-md:justify-start max-md:px-3 group-data-[collapsible=icon]:w-full! md:h-10 md:p-0",
                          active &&
                            "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs",
                        )}
                        aria-label={item.title}
                        onClick={() => prepareNavigation(item.href)}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="sr-only max-md:not-sr-only ml-2 text-sm font-medium">
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                <SidebarMenuItem>
                  <SidebarMenuButton
                    type="button"
                    isActive={analyticsOpen}
                    tooltip="Activity insights"
                    tooltipAlways
                    className={cn(
                      "justify-center max-md:justify-start max-md:px-3 group-data-[collapsible=icon]:w-full! md:h-10 md:p-0",
                      analyticsOpen &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs",
                    )}
                    aria-label="Open activity insights"
                    aria-pressed={analyticsOpen}
                    onClick={() => {
                      setOpenMobile(false);
                      setAnalyticsOpen(true);
                    }}
                  >
                    <ChartBar className="size-4 shrink-0" />
                    <span className="sr-only max-md:not-sr-only ml-2 text-sm font-medium">
                      Activity insights
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            {utilityItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={active}
                    tooltip={item.title}
                    tooltipAlways
                    className={cn(
                      "justify-center max-md:justify-start max-md:px-3 group-data-[collapsible=icon]:w-full! md:h-10 md:p-0",
                      active &&
                        "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-xs",
                    )}
                    aria-label={item.title}
                    onClick={() => prepareNavigation(item.href)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="sr-only max-md:not-sr-only ml-2 text-sm font-medium">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
          <NavUser user={user} compact />
        </SidebarFooter>
      </Sidebar>

      <Sidebar
        collapsible="none"
        className="flex-1 overflow-hidden"
        style={{
          width: open ? `${sidebarWidth}px` : 0,
        }}
      >
        {pathname === "/inbox" ? <InboxPanel variant="sidebar" /> : null}
        {pathname === "/calendar" ? (
          <CalendarSidebar accountEmail={user.email} />
        ) : null}
        {pathname === "/agent" ? <AgentSidebar /> : null}
        {pathname === "/search" ? <GmailSearch variant="panel" /> : null}
      </Sidebar>

      {open && panelRoute && pathname !== "/agent" ? (
        <SidebarResizeHandle />
      ) : null}

      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent
          side="right"
          className="w-full max-w-full sm:max-w-full md:max-w-full lg:max-w-[44rem]! gap-0 p-0"
          showCloseButton={false}
        >
          <SheetHeader className="flex h-16 shrink-0 flex-row items-center gap-3 border-b px-4 py-0">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
              <ChartBar className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-sm font-semibold">
                Activity insights
              </SheetTitle>
              <SheetDescription className="truncate text-xs">
                Email patterns, calendar load, and meeting attendance
              </SheetDescription>
            </div>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close activity insights"
                />
              }
            >
              <X />
            </SheetClose>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <AnalyticsDrawerContent
              open={analyticsOpen}
              userEmail={user.email}
            />
          </div>
        </SheetContent>
      </Sheet>
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
