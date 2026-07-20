import { processWebhook } from "corsair";
import { NextResponse } from "next/server";

import { corsair } from "@/server/corsair";
import { connections } from "@/server/db";
import { verifyWebhookTenantToken } from "@/server/webhooks/tenant-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenantId") ?? "";
  const token = url.searchParams.get("token") ?? "";

  if (!tenantId || !token || !verifyWebhookTenantToken(tenantId, token)) {
    return NextResponse.json(
      { error: "Invalid webhook tenant token." },
      { status: 401 },
    );
  }

  try {
    const body = await request.text();
    const headers = Object.fromEntries(request.headers.entries());
    const query = Object.fromEntries(url.searchParams.entries());
    const result = await processWebhook(corsair, headers, body, {
      ...query,
      tenantId,
    });

    if (!result.plugin) {
      return NextResponse.json(
        { error: "No Corsair integration matched this webhook." },
        { status: 404 },
      );
    }

    try {
      await connections.notify(
        "on_emit_realtime",
        JSON.stringify({
          tenantId,
          plugin: result.plugin,
          action: result.action,
          receivedAt: new Date().toISOString(),
        }),
      );
    } catch (error) {
      console.error("Realtime notify failed after webhook success:", error);
    }

    return NextResponse.json(result.response ?? { success: true }, {
      headers: result.responseHeaders,
    });
  } catch (error) {
    console.error("Corsair webhook processing failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
