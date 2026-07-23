import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (typeof data?.claims?.sub === "string" && data.claims.sub) {
    redirect("/focus");
  }

  const params = await searchParams;
  const nextPath = getSafeNextPath(firstValue(params.next));
  const errorCode = firstValue(params.error);

  return (
    <AuthPageShell
      mode="login"
      nextPath={nextPath}
      {...(errorCode ? { errorCode } : {})}
    />
  );
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
