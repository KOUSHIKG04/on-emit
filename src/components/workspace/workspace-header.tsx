"use client";

import { CalendarDays, Inbox, Sparkles } from "lucide-react";

import { QuickActionDialog } from "@/components/quick-actions/quick-action-dialog";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

const viewDetails = {
  focus: {
    label: "Focus",
    description: "Inbox and schedule at a glance",
    icon: Sparkles,
  },
  inbox: {
    label: "Inbox",
    description: "Read and manage Gmail conversations",
    icon: Inbox,
  },
  calendar: {
    label: "Calendar",
    description: "Review your upcoming schedule",
    icon: CalendarDays,
  },
} as const;

export function WorkspaceHeader() {
  const activeView = useWorkspaceStore((state) => state.activeView);
  const current = viewDetails[activeView];
  const Icon = current.icon;

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 flex h-16 shrink-0 items-center border-b backdrop-blur">
      <div className="flex w-full min-w-0 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />

          <div className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{current.label}</p>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {current.description}
            </p>
          </div>
        </div>

        <QuickActionDialog />
      </div>
    </header>
  );
}
