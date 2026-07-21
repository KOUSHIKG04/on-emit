"use client";

import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";
import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { InboxWorkspace } from "@/components/workspace/inbox-workspace";
import { SearchWorkspace } from "@/components/workspace/search-workspace";
import { SettingsWorkspace } from "@/components/workspace/settings-workspace";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceContent({ userName }: { userName: string }) {
  const activeView = useWorkspaceStore((state) => state.activeView);
  if (activeView === "inbox") {
    return <InboxWorkspace />;
  }
  if (activeView === "calendar") {
    return <CalendarWorkspace />;
  }
  if (activeView === "search") return <SearchWorkspace />;
  if (activeView === "settings") return <SettingsWorkspace />;

  return <FocusWorkspace userName={userName} />;
}
