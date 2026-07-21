import { InboxPanel } from "@/components/mail/inbox-panel";
import { ThreadReader } from "@/components/mail/thread-reader";

export function InboxWorkspace() {
  return (
    <div className="bg-border grid min-h-full md:grid-cols-1 [&>[data-slot=card]]:min-h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0">
      <div className="md:hidden">
        <InboxPanel />
      </div>

      <ThreadReader />
    </div>
  );
}
