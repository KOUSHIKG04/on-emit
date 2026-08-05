import { NextResponse, type NextRequest } from "next/server";

import { corsair } from "@/server/corsair";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";

function appRedirect(request: NextRequest, error: string) {
  const returnToParam = request.nextUrl.searchParams.get("returnTo");
  const returnToCookie = request.cookies.get("connect_return_to")?.value;
  const targetPath = getSafeNextPath(
    returnToParam || returnToCookie || "/settings",
    "/settings",
  );

  const url = new URL(targetPath, request.url);
  url.searchParams.set("connect_error", error);
  const response = NextResponse.redirect(url);
  response.cookies.delete("connect_return_to");
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const returnTo = request.nextUrl.searchParams.get("returnTo");

  if (!state) {
    return appRedirect(request, "missing_state");
  }

  try {
    const connection = await corsair.manage.connect.resolve(state);

    const response = NextResponse.redirect(connection.oauthUrl);
    if (returnTo) {
      const validPath = getSafeNextPath(returnTo, "/settings");
      response.cookies.set("connect_return_to", validPath, {
        path: "/",
        maxAge: 600,
        httpOnly: true,
        sameSite: "lax",
      });
    }
    return response;
  } catch (error) {
    console.error("Failed to resolve Corsair connection link:", error);
    return appRedirect(request, "invalid_or_expired_link");
  }
}
