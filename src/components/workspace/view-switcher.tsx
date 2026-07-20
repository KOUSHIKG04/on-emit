"use client";

import { CalendarDays, Inbox, Search, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import type { WorkspaceView } from "@/stores/workspace-store";

const views: Array<{
  value: WorkspaceView;
  label: string;
  icon: typeof Sparkles;
}> = [
  {
    value: "focus",
    label: "Focus",
    icon: Sparkles,
  },
  {
    value: "inbox",
    label: "Inbox",
    icon: Inbox,
  },
  {
    value: "calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    value: "search",
    label: "Search",
    icon: Search,
  },
];

export function ViewSwitcher() {
  const activeView = useWorkspaceStore((state) => state.activeView);

  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((view) => {
        const Icon = view.icon;
        const active = activeView === view.value;

        return (
          <Button
            key={view.value}
            type="button"
            variant={active ? "default" : "outline"}
            aria-pressed={active}
            onClick={() => setActiveView(view.value)}
          >
            <Icon />
            {view.label}
          </Button>
        );
      })}
    </div>
  );
}
