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

export function getTenantCorsair(tenantId: string) {
  return corsair.withTenant(tenantId);
}
