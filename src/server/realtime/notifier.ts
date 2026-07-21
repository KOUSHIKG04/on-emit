import "server-only";

import { connections } from "@/server/db";

export type RealtimePayload = {
  tenantId?: unknown;
  plugin?: unknown;
  action?: unknown;
  receivedAt?: unknown;
};

type Subscriber = (payload: RealtimePayload) => void;

type RealtimeNotifierState = {
  subscribers: Map<string, Set<Subscriber>>;
  listenerPromise: Promise<void> | null;
};

const globalForRealtime = globalThis as unknown as {
  onEmitRealtimeNotifier?: RealtimeNotifierState;
};

const state: RealtimeNotifierState =
  globalForRealtime.onEmitRealtimeNotifier ?? {
    subscribers: new Map<string, Set<Subscriber>>(),
    listenerPromise: null,
  };

globalForRealtime.onEmitRealtimeNotifier = state;

async function ensureListener() {
  state.listenerPromise ??= connections
    .listen("on_emit_realtime", (rawPayload: string) => {
      try {
        const payload = JSON.parse(rawPayload) as RealtimePayload;
        const tenantId = payload.tenantId;
        if (typeof tenantId !== "string") return;

        const subscribers = state.subscribers.get(tenantId);
        if (!subscribers) return;

        for (const subscriber of subscribers) {
          try {
            subscriber(payload);
          } catch (error) {
            console.warn("Realtime subscriber failed:", error);
          }
        }
      } catch (error) {
        console.warn("Ignored malformed realtime payload:", error);
      }
    })
    .then(() => undefined)
    .catch((error) => {
      state.listenerPromise = null;
      throw error;
    });

  await state.listenerPromise;
}

export async function subscribeToRealtime(
  tenantId: string,
  subscriber: Subscriber,
) {
  const tenantSubscribers =
    state.subscribers.get(tenantId) ?? new Set<Subscriber>();
  tenantSubscribers.add(subscriber);
  state.subscribers.set(tenantId, tenantSubscribers);

  try {
    await ensureListener();
  } catch (error) {
    tenantSubscribers.delete(subscriber);
    if (tenantSubscribers.size === 0) state.subscribers.delete(tenantId);
    throw error;
  }

  let subscribed = true;
  return () => {
    if (!subscribed) return;
    subscribed = false;
    tenantSubscribers.delete(subscriber);
    if (tenantSubscribers.size === 0) state.subscribers.delete(tenantId);
  };
}
