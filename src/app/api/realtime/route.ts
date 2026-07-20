import { createClient } from "@/lib/supabase/server";
import { connections } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RealtimePayload = {
  tenantId?: unknown;
  plugin?: unknown;
  action?: unknown;
  receivedAt?: unknown;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const tenantId = data?.claims?.sub;

  if (!tenantId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unlisten: (() => Promise<void>) | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function send(event: string, payload: unknown) {
        if (closed) return;
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`,
          ),
        );
      }

      send("connected", { connectedAt: new Date().toISOString() });

      const listener = await connections.listen(
        "on_emit_realtime",
        (rawPayload) => {
          try {
            const payload = JSON.parse(rawPayload) as RealtimePayload;
            if (payload.tenantId === tenantId) send("integration", payload);
          } catch (error) {
            console.warn("Ignored malformed realtime payload:", error);
          }
        },
      );
      unlisten = () => listener.unlisten();
      heartbeat = setInterval(
        () => send("heartbeat", { now: Date.now() }),
        25_000,
      );
    },
    async cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      await unlisten?.();
    },
  });

  request.signal.addEventListener("abort", () => {
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    void unlisten?.();
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
