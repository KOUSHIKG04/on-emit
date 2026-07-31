import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/env";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const authPath =
    requestUrl.searchParams.get("mode") === "signup" ? "/signup" : "/login";

  if (!code) {
    return redirectToAuthError(authPath, nextPath, "missing_oauth_code");
  }

  const supabase = await createClient();
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectToAuthError(authPath, nextPath, "oauth_callback_failed");
    }
  } catch {
    return redirectToAuthError(authPath, nextPath, "oauth_callback_failed");
  }

  // The destination is restricted to known workspace routes and uses APP_URL
  // as its fixed origin.
  return NextResponse.redirect(new URL(nextPath, env.APP_URL));
}

function redirectToAuthError(
  authPath: "/login" | "/signup",
  nextPath: string,
  errorCode: string,
) {
  const errorUrl = new URL(authPath, env.APP_URL);
  errorUrl.searchParams.set("next", nextPath);
  errorUrl.searchParams.set("error", errorCode);

  return NextResponse.redirect(errorUrl);
}
