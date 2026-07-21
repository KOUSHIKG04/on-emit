import { DashboardOverview } from "@/components/workspace/dashboard-overview";

export function FocusWorkspace({ userName }: { userName: string }) {
  return <DashboardOverview userName={userName} />;
}
