"use client";

import { usePathname } from "next/navigation";
import {
  Ghost2,
  CalendarDays,
  Inbox,
  Search,
  Settings,
  FocusCentered,
} from "@/components/icons";
import { IntegrationActions } from "@/components/integrations/integration-actions";
import { QuickActionDialog } from "@/components/quick-actions/quick-action-dialog";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceCommandMenu } from "@/components/workspace/workspace-command-menu";

const viewDetails = {
  "/agent": {
    label: "Agent",
    description: "Chat with Gmail and Calendar through Corsair MCP",
    icon: Ghost2,
  },
  "/focus": {
    label: "Focus",
    description: "Inbox and schedule at a glance",
    icon: FocusCentered,
  },
  "/inbox": {
    label: "Inbox",
    description: "Read and manage Gmail conversations",
    icon: Inbox,
  },
  "/calendar": {
    label: "Calendar",
    description: "Review your upcoming schedule",
    icon: CalendarDays,
  },
  "/search": {
    label: "Search",
    description: "Find Gmail conversations with advanced operators",
    icon: Search,
  },
  "/settings": {
    label: "Settings",
    description: "Manage Gmail, Calendar, and webhook connections",
    icon: Settings,
  },
} as const;

export function WorkspaceHeader() {
  const pathname = usePathname();
  const current =
    viewDetails[pathname as keyof typeof viewDetails] ?? viewDetails["/focus"];
  const Icon = current.icon;

  return (
    <header className="bg-card/95 supports-backdrop-filter:bg-card/80 sticky top-0 z-20 flex h-16 shrink-0 items-center border-b backdrop-blur">
      <div className="flex w-full min-w-0 items-center gap-3 px-4 md:gap-4 md:px-6">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          <SidebarTrigger className="shrink-0 md:hidden" />
          <span className="truncate text-sm font-semibold md:hidden">
            On Emit
          </span>

          <div className="bg-primary/15 text-primary hidden size-8 shrink-0 items-center justify-center rounded-lg md:flex">
            <Icon className="size-4" />
          </div>

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-semibold">{current.label}</p>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {current.description}
            </p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <WorkspaceCommandMenu className="w-9 min-w-0 flex-none px-2 sm:w-52 sm:min-w-0 sm:flex-none lg:max-w-none" />
          <IntegrationActions />
          <QuickActionDialog />
        </div>
      </div>
    </header>
  );
}
