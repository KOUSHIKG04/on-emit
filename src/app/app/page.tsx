import { IntegrationStatus } from "@/components/integrations/integration-status";
import { WorkspaceContent } from "@/components/workspace/workspace-content";

export default function AppPage() {
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="flex flex-col gap-2">
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            Live workspace
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Inbox and schedule, in one place
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm md:text-base">
              Work through Gmail conversations and Google Calendar events
              without leaving your command center.
            </p>
          </div>
        </section>

        <IntegrationStatus />
        <WorkspaceContent />
      </div>
    </main>
  );
}
