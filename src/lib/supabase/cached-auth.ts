import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const getCachedAuth = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims ||
    typeof data.claims.sub !== "string" ||
    !data.claims.sub
  ) {
    redirect("/login");
  }

  return data;
});
