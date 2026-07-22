import { Suspense, type ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { OAuthToastListener } from "@/components/integrations/oauth-toast-listener";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceStoreProvider } from "@/providers/workspace-store-provider";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { WorkspaceSidebarProvider } from "@/components/workspace/workspace-sidebar-provider";
import { getCachedAuth } from "@/lib/supabase/cached-auth";

type WorkspaceLayoutProps = {
  children: ReactNode;
};

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

export default async function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  const { claims } = await getCachedAuth();
  const claimValues = asRecord(claims);
  const metadata = asRecord(claimValues.user_metadata);

  const email =
    typeof claimValues.email === "string"
      ? claimValues.email
      : "Signed-in user";
  const name =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : (email.split("@")[0] ?? "On Emit user");
  const avatar =
    typeof metadata.avatar_url === "string"
      ? metadata.avatar_url
      : typeof metadata.picture === "string"
        ? metadata.picture
        : undefined;

  return (
    <WorkspaceStoreProvider>
      <Toaster position="top-right" richColors />
      <Suspense fallback={null}>
        <OAuthToastListener />
      </Suspense>
      <RealtimeSync />
      <WorkspaceSidebarProvider>
        <AppSidebar
          user={{
            name,
            email,
            ...(avatar ? { avatar } : {}),
          }}
        />

        <SidebarInset className="min-w-0">
          <WorkspaceHeader />
          {children}
        </SidebarInset>
      </WorkspaceSidebarProvider>
    </WorkspaceStoreProvider>
  );
}
