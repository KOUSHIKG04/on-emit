"use client";

import { GmailSearch } from "@/components/mail/gmail-search";
import { ThreadReader } from "@/components/mail/thread-reader";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function SearchWorkspace() {
  const selectedThreadId = useWorkspaceStore(
    (state) => state.selectedSearchThreadId,
  );
  const selectThread = useWorkspaceStore((state) => state.selectSearchThread);

  return (
    <div className="bg-border grid h-full min-h-0 *:data-[slot=card]:min-h-0 *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-1">
      <div className="h-full min-h-0 overflow-hidden md:hidden">
        <GmailSearch variant="panel" />
      </div>

      <ThreadReader
        threadId={selectedThreadId ?? undefined}
        onClose={() => selectThread(null)}
      />
    </div>
  );
}
