import { IntegrationStatus } from "@/components/integrations/integration-status";
import { ViewSwitcher } from "@/components/workspace/view-switcher";
import { WorkspaceContent } from "@/components/workspace/workspace-content";

export default function AppPage() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-primary text-sm font-medium">
              Live Gmail and Calendar
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Your focus workspace
            </h1>

            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              View your important conversations and upcoming schedule without
              switching between Gmail and Google Calendar.
            </p>
          </div>

          <ViewSwitcher />
        </div>

        <div className="mt-6">
          <IntegrationStatus />
        </div>

        <div className="mt-6">
          <WorkspaceContent />
        </div>
      </div>
    </main>
  );
}
