import { InboxPanel } from "@/components/mail/inbox-panel";
import { ThreadReader } from "@/components/mail/thread-reader";

export function InboxWorkspace() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="xl:sticky xl:top-20">
        <InboxPanel />
      </div>

      <ThreadReader />
    </div>
  );
}
