import { IntegrationStatus } from "@/components/integrations/integration-status";
import { AiProviderSettings } from "@/components/settings/ai-provider-settings";

export function SettingsWorkspace() {
  return (
    <div className="flex w-full max-w-full flex-col gap-0 p-0 md:gap-6 md:p-6">
      <IntegrationStatus />
      <AiProviderSettings />
    </div>
  );
}
