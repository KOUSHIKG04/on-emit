"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

import {
  cleanOAuthFeedbackUrl,
  getOAuthFeedback,
} from "@/components/integrations/oauth-feedback";
import { toast } from "@/components/ui/toaster";

export function OAuthToastListener() {
  const searchParams = useSearchParams();
  const handledFeedbackId = useRef<string | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const feedback = getOAuthFeedback(currentUrl.searchParams);

    if (!feedback) return;

    // Remove one-time callback state synchronously. This prevents a remount from
    // replaying the toast and preserves unrelated query parameters and hashes.
    window.history.replaceState(
      window.history.state,
      "",
      cleanOAuthFeedbackUrl(currentUrl),
    );

    if (handledFeedbackId.current === feedback.id) return;
    handledFeedbackId.current = feedback.id;

    toast[feedback.type](feedback.title, {
      description: feedback.description,
      duration: feedback.duration,
      id: feedback.id,
    });
  }, [searchParams]);

  return null;
}
