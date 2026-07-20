"use client";

import { UpcomingEvents } from "@/components/calendar/upcoming-events";
import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { InboxWorkspace } from "@/components/workspace/inbox-workspace";
import { SearchWorkspace } from "@/components/workspace/search-workspace";
import { SettingsWorkspace } from "@/components/workspace/settings-workspace";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceContent() {
  const activeView = useWorkspaceStore((state) => state.activeView);
  if (activeView === "inbox") {
    return <InboxWorkspace />;
  }
  if (activeView === "calendar") {
    return (
      <div className="min-h-full [&>[data-slot=card]]:min-h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0">
        <UpcomingEvents />
      </div>
    );
  }
  if (activeView === "search") return <SearchWorkspace />;
  if (activeView === "settings") return <SettingsWorkspace />;

  return <FocusWorkspace />;
}
