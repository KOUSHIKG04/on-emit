import { UpcomingEvents } from "@/components/calendar/upcoming-events";
import { InboxPanel } from "@/components/mail/inbox-panel";

export function FocusWorkspace() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
      <InboxPanel />
      <UpcomingEvents />
    </div>
  );
}
