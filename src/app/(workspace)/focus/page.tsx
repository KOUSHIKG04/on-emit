import { FocusWorkspace } from "@/components/workspace/focus-workspace";
import { getCachedAuth } from "@/lib/supabase/cached-auth";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export default async function FocusPage() {
  const { claims } = await getCachedAuth();
  const claimValues = asRecord(claims);
  const metadata = asRecord(claimValues.user_metadata);
  const email = typeof claimValues.email === "string" ? claimValues.email : "";
  const userName =
    [metadata.full_name, metadata.name, email.split("@")[0]].find(
      (value): value is string => typeof value === "string" && value.length > 0,
    ) ?? "there";

  return (
    <main className="grid min-h-0 flex-1 overflow-auto">
      <FocusWorkspace userName={userName} />
    </main>
  );
}
