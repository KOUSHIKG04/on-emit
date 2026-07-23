import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isProtectedWorkspacePath } from "@/lib/auth/safe-next-path";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          // Make refreshed cookies available to Server Components.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          // Send refreshed cookies back to the browser.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Validates the access token and refreshes it when necessary.
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated =
    !error &&
    typeof data?.claims?.sub === "string" &&
    data.claims.sub.length > 0;

  if (isProtectedWorkspacePath(request.nextUrl.pathname) && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", requestedPath);

    return copyCookies(response, NextResponse.redirect(loginUrl));
  }

  if (
    isAuthenticated &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    const workspaceUrl = request.nextUrl.clone();
    workspaceUrl.pathname = "/focus";
    workspaceUrl.search = "";

    return copyCookies(response, NextResponse.redirect(workspaceUrl));
  }

  // Return this exact response because it contains updated cookies.
  return response;
}

function copyCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    destination.cookies.set(name, value, options);
  });

  return destination;
}
