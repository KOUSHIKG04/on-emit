import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { WorkspaceStoreProvider } from "@/providers/workspace-store-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

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
