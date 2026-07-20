"use client";

import { useEffect } from "react";

import { api } from "@/trpc/react";

type IntegrationEvent = {
  plugin?: string;
};

export function RealtimeSync() {
  const utils = api.useUtils();

  useEffect(() => {
    const events = new EventSource("/api/realtime");

    function refresh(event: MessageEvent<string>) {
      try {
        const payload = JSON.parse(event.data) as IntegrationEvent;

        if (payload.plugin === "gmail") {
          void utils.gmail.invalidate();
        }

        if (payload.plugin === "googlecalendar") {
          void utils.calendar.invalidate();
        }

        void utils.integrations.status.invalidate();
      } catch (error) {
        console.warn("Ignored invalid realtime browser event:", error);
      }
    }

    events.addEventListener("integration", refresh as EventListener);

    return () => {
      events.removeEventListener("integration", refresh as EventListener);
      events.close();
    };
  }, [utils]);

  return null;
}
