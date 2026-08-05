import "server-only";

import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { createCorsair } from "corsair";

import { env } from "@/env";
import { connections } from "@/server/db";

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: connections,
  kek: env.CORSAIR_KEK,
  multiTenancy: true,
  manual: {
    baseUrl: new URL("/connect", env.APP_URL).toString(),
    redirectUri: new URL("/api/corsair/oauth/callback", env.APP_URL).toString(),
  },
});

type ConnectionStatus = Awaited<
  ReturnType<typeof corsair.manage.connectionStatus.get>
>;

const CONNECTION_STATUS_TTL_MS = 10_000;
const connectionStatusCache = new Map<
  string,
  { expiresAt: number; request: Promise<ConnectionStatus> }
>();

/**
 * Dashboard requests commonly ask Gmail and Calendar for data at the same
 * time. Corsair's connection check is remote, so share the in-flight request
 * and its result briefly instead of paying for the same lookup per router.
 */
export function getCorsairConnectionStatus(tenantId: string) {
  const now = Date.now();
  const cached = connectionStatusCache.get(tenantId);

  if (cached && cached.expiresAt > now) {
    return cached.request;
  }

  const request = corsair.manage.connectionStatus.get({ tenantId });

  connectionStatusCache.set(tenantId, {
    expiresAt: now + CONNECTION_STATUS_TTL_MS,
    request,
  });

  void request.catch(() => {
    const current = connectionStatusCache.get(tenantId);
    if (current?.request === request) {
      connectionStatusCache.delete(tenantId);
    }
  });

  return request;
}

export function invalidateCorsairConnectionStatus(tenantId: string) {
  connectionStatusCache.delete(tenantId);
}

export function getTenantCorsair(tenantId: string) {
  return corsair.withTenant(tenantId);
}
