import { createClient } from "@/lib/supabase/server";
import { subscribeToRealtime } from "@/server/realtime/notifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const tenantId = data?.claims?.sub;

  if (!tenantId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;
  let closed = false;
  let cleanedUp = false;

  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    closed = true;
    request.signal.removeEventListener("abort", cleanup);
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
    unsubscribe?.();
    unsubscribe = undefined;
  }

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

      try {
        const stopListening = await subscribeToRealtime(tenantId, (payload) =>
          send("integration", payload),
        );

        if (closed) {
          stopListening();
          return;
        }

        unsubscribe = stopListening;
        heartbeat = setInterval(
          () => send("heartbeat", { now: Date.now() }),
          25_000,
        );
      } catch (error) {
        if (!closed) {
          cleanup();
          controller.error(error);
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  request.signal.addEventListener("abort", cleanup, { once: true });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
