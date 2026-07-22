import { NextResponse, type NextRequest } from "next/server";

import { corsair } from "@/server/corsair";

function appRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/settings", request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const providerError = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (providerError) {
    return appRedirect(request, { connect_error: providerError });
  }

  if (!code || !state) {
    return appRedirect(request, { connect_error: "missing_callback_data" });
  }

  try {
    const result = await corsair.manage.connect.oauthCallback({
      code,
      state,
    });

    return appRedirect(request, { connected: result.plugin });
  } catch (error) {
    console.error("Corsair OAuth callback failed:", error);
    return appRedirect(request, { connect_error: "oauth_callback_failed" });
  }
}
