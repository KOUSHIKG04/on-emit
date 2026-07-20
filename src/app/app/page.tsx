import { AgentPanel } from "@/components/agent/agent-panel";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { getCachedAuth } from "@/app/app/cached-auth";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AppPage() {
  const { claims } = await getCachedAuth();
  const claimValues = asRecord(claims);
  const metadata = asRecord(claimValues.user_metadata);
  const email =
    typeof claimValues.email === "string" ? claimValues.email : "";
  const userName =
    (typeof metadata.full_name === "string" && metadata.full_name) ||
    (typeof metadata.name === "string" && metadata.name) ||
    email.split("@")[0] ||
    "there";

  return (
    <main className="grid min-h-0 flex-1 overflow-auto">
      <WorkspaceContent userName={userName} />
      <AgentPanel />
    </main>
  );
}
