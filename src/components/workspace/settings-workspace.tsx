import { IntegrationStatus } from "@/components/integrations/integration-status";
import { AiProviderSettings } from "@/components/settings/ai-provider-settings";

export function SettingsWorkspace() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <AiProviderSettings />
      <IntegrationStatus />
    </div>
  );
}
