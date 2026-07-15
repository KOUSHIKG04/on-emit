import type { ReactNode } from "react";
import { WorkspaceStoreProvider } from "@/providers/workspace-store-provider";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";
import { getCachedAuth } from "./cached-auth";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const data = await getCachedAuth();

  const email =
    typeof data.claims.email === "string"
      ? data.claims.email
      : "Signed-in user";

  return (
    <WorkspaceStoreProvider>
      <div className="bg-background text-foreground min-h-screen">
        <header className="border-border flex h-16 items-center justify-between border-b px-6">
          <div>
            <p className="font-semibold">On Emit</p>
            <p className="text-muted-foreground text-xs">{email}</p>
          </div>

          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </header>

        {children}
      </div>
    </WorkspaceStoreProvider>
  );
}
