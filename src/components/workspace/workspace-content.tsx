"use client";

import { UpcomingEvents } from "@/components/calendar/upcoming-events";
import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { InboxWorkspace } from "@/components/workspace/inbox-workspace";
import { SearchWorkspace } from "@/components/workspace/search-workspace";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceContent() {
  const activeView = useWorkspaceStore((state) => state.activeView);

  if (activeView === "inbox") {
    return <InboxWorkspace />;
  }
  if (activeView === "calendar") return <UpcomingEvents />;
  if (activeView === "search") return <SearchWorkspace />;

  return <FocusWorkspace />;
}
