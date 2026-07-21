"use client";

import { GmailSearch } from "@/components/mail/gmail-search";
import { ThreadReader } from "@/components/mail/thread-reader";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function SearchWorkspace() {
  const selectedThreadId = useWorkspaceStore(
    (state) => state.selectedSearchThreadId,
  );
  const selectThread = useWorkspaceStore((state) => state.selectSearchThread);

  return (
    <div className="bg-border grid min-h-full md:grid-cols-1 [&>[data-slot=card]]:min-h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0">
      <div className="md:hidden">
        <GmailSearch variant="panel" />
      </div>

      <ThreadReader
        threadId={selectedThreadId ?? undefined}
        onClose={() => selectThread(null)}
      />
    </div>
  );
}
