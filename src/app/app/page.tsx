import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ViewSwitcher } from "@/components/workspace/view-switcher";

export default async function AppPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const userId = data?.claims?.sub;
  const email =
    typeof data?.claims?.email === "string" ? data.claims.email : null;

  return (
    <main className="p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-primary text-sm font-medium">
          Authentication successful
        </p>
        <div className="mt-6">
          <ViewSwitcher />
        </div>
        <h1 className="mt-2 text-3xl font-semibold">Your workspace</h1>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Account connection</CardTitle>
            <CardDescription>
              This Supabase identity will isolate the user&apos;s Corsair data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-muted-foreground text-sm">Supabase user</dt>
                <dd className="mt-1">{email ?? "No email available"}</dd>
              </div>

              <div>
                <dt className="text-muted-foreground text-sm">
                  Future Corsair tenant ID
                </dt>
                <dd className="mt-1 font-mono text-sm break-all">{userId}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
