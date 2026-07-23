const workspaceRoutePattern =
  /^\/(?:focus|inbox|calendar|search|agent|analytics|settings)(?:\/|$)/;

export function getSafeNextPath(value: unknown) {
  if (typeof value !== "string") {
    return "/focus";
  }

  try {
    const baseUrl = new URL("https://onemit.local");
    const destination = new URL(value, baseUrl);

    if (
      destination.origin !== baseUrl.origin ||
      !workspaceRoutePattern.test(destination.pathname)
    ) {
      return "/focus";
    }

    return `${destination.pathname}${destination.search}`;
  } catch {
    return "/focus";
  }
}

export function isProtectedWorkspacePath(pathname: string) {
  return workspaceRoutePattern.test(pathname);
}
