import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/env";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_oauth_code", requestUrl.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=oauth_callback_failed", requestUrl.origin),
    );
  }

  // The callback has one fixed destination. Never trust Host, forwarded-host,
  // or a URL-supplied redirect for an authentication boundary.
  return NextResponse.redirect(new URL("/app", env.APP_URL));
}
