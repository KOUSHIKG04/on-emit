import { IntegrationStatus } from "@/components/integrations/integration-status";

export function SettingsWorkspace() {
  return (
    <div className="min-h-full [&>[data-slot=card]]:min-h-full [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:ring-0">
      <IntegrationStatus />
    </div>
  );
}
