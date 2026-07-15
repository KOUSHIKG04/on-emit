"use client";

import { UpcomingEvents } from "@/components/calendar/upcoming-events";
import { InboxPanel } from "@/components/mail/inbox-panel";
import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function WorkspaceContent() {
  const activeView = useWorkspaceStore((state) => state.activeView);

  if (activeView === "inbox") return <InboxPanel />;
  if (activeView === "calendar") return <UpcomingEvents />;

  return <FocusWorkspace />;
}
