const workspaceRoutePattern =
  /^\/(?:focus|inbox|calendar|search|agent|analytics|settings)(?:\/|$)/;

export function getSafeNextPath(value: unknown, fallback = "/focus") {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const baseUrl = new URL("https://onemit.local");
    const destination = new URL(value, baseUrl);

    if (
      destination.origin !== baseUrl.origin ||
      !workspaceRoutePattern.test(destination.pathname)
    ) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}`;
  } catch {
    return fallback;
  }
}

export function isProtectedWorkspacePath(pathname: string) {
  return workspaceRoutePattern.test(pathname);
}
