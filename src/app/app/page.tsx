import { AgentPanel } from "@/components/agent/agent-panel";
import { WorkspaceContent } from "@/components/workspace/workspace-content";

export default function AppPage() {
  return (
    <main className="grid min-h-0 flex-1 overflow-auto">
      <WorkspaceContent />
      <AgentPanel />
    </main>
  );
}
