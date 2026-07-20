import { IntegrationStatus } from "@/components/integrations/integration-status";
import { WorkspaceContent } from "@/components/workspace/workspace-content";

export default function AppPage() {
  return (
    <main className="min-h-0 flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <IntegrationStatus />
        <WorkspaceContent />
      </div>
    </main>
  );
}
