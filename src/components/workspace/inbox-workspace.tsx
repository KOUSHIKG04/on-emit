"use client";

import { InboxPanel } from "@/components/mail/inbox-panel";
import { ThreadReader } from "@/components/mail/thread-reader";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function InboxWorkspace() {
  const selectedThreadId = useWorkspaceStore((state) => state.selectedThreadId);
  const selectThread = useWorkspaceStore((state) => state.selectThread);

  return (
    <div className="bg-background flex size-full min-h-full flex-1 flex-col overflow-hidden *:data-[slot=card]:min-h-full *:data-[slot=card]:rounded-none *:data-[slot=card]:border-0 *:data-[slot=card]:ring-0">
      {/* Mobile View (Gmail App Style) */}
      <div className="flex size-full flex-1 flex-col overflow-hidden md:hidden">
        {selectedThreadId ? (
          <ThreadReader
            threadId={selectedThreadId}
            onClose={() => selectThread(null)}
          />
        ) : (
          <InboxPanel />
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden size-full flex-1 overflow-hidden md:block">
        <ThreadReader />
      </div>
    </div>
  );
}
