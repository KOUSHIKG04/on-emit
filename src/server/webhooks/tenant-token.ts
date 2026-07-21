import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/env";

export function createWebhookTenantToken(tenantId: string) {
  return createHmac("sha256", env.CORSAIR_KEK)
    .update(`on-emit:webhook:${tenantId}`)
    .digest("hex");
}

export function verifyWebhookTenantToken(tenantId: string, token: string) {
  const expected = Buffer.from(createWebhookTenantToken(tenantId), "utf8");
  const received = Buffer.from(token, "utf8");

  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}
