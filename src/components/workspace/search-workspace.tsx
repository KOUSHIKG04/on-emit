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
    <div
      className={cn(
        "min-h-full min-w-0",
        selectedThreadId
          ? "bg-border grid gap-px lg:grid-cols-[minmax(26rem,34rem)_minmax(0,1fr)] [&>[data-slot=card]]:min-h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0"
          : "bg-background p-4 md:p-7 xl:p-10",
      )}
    >
      <GmailSearch variant={selectedThreadId ? "panel" : "page"} />
      {selectedThreadId ? (
        <ThreadReader
          threadId={selectedThreadId}
          onClose={() => selectThread(null)}
        />
      ) : null}
    </div>
  );
}
