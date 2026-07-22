import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/focus");
  }

  return (
    <main className="bg-muted/40 relative flex min-h-svh items-center justify-center overflow-hidden p-5 sm:p-8">
      <div className="bg-primary/10 absolute -top-40 -left-40 size-96 rounded-full blur-3xl" />
      <div className="bg-accent/20 absolute -right-40 -bottom-40 size-96 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-5xl">
        <LoginForm />
      </div>
    </main>
  );
}
