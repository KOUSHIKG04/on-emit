import { IntegrationStatus } from "@/components/integrations/integration-status";
import { AiProviderSettings } from "@/components/settings/ai-provider-settings";

export function SettingsWorkspace() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:p-6">
      <IntegrationStatus />
      <AiProviderSettings />
    </div>
  );
}
