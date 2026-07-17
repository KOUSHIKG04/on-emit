import { NextResponse, type NextRequest } from "next/server";

import { corsair } from "@/server/corsair";

function appRedirect(request: NextRequest, error: string) {
  const url = new URL("/app", request.url);
  url.searchParams.set("connect_error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");

  if (!state) {
    return appRedirect(request, "missing_state");
  }

  try {
    const connection = await corsair.manage.connect.resolve(state);

    return NextResponse.redirect(connection.oauthUrl);
  } catch (error) {
    console.error("Failed to resolve Corsair connection link:", error);
    return appRedirect(request, "invalid_or_expired_link");
  }
}
