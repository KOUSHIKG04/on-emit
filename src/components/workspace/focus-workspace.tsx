import { UpcomingEvents } from "@/components/calendar/upcoming-events";
import { IntegrationStatus } from "@/components/integrations/integration-status";
import { InboxPanel } from "@/components/mail/inbox-panel";

export function FocusWorkspace() {
  return (
    <div className="bg-border grid min-h-full grid-rows-[auto_minmax(0,1fr)] gap-px">
      <IntegrationStatus className="rounded-none ring-0" />

      <div className="bg-border grid min-h-0 gap-px xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)] [&>[data-slot=card]]:h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0">
        <InboxPanel />
        <UpcomingEvents />
      </div>
    </div>
  );
}
