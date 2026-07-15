"use client";

import { CalendarDays, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function ViewSwitcher() {
  const activeView = useWorkspaceStore((state) => state.activeView);

  const setActiveView = 
        useWorkspaceStore((state) => state.setActiveView);

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={activeView === "inbox" ? "default" : "outline"}
        aria-pressed={activeView === "inbox"}
        onClick={() => setActiveView("inbox")}
      >
        <Inbox />
        Inbox
      </Button>

      <Button
        type="button"
        variant={activeView === "calendar" ? "default" : "outline"}
        aria-pressed={activeView === "calendar"}
        onClick={() => setActiveView("calendar")}
      >
        <CalendarDays />
        Calendar
      </Button>
    </div>
  );
}
