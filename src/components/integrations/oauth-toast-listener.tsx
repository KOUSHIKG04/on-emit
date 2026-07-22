"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toaster";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  redirect_uri_mismatch: {
    title: "Google OAuth Configuration Mismatch",
    description:
      "Redirect URI mismatch error. Ensure http://localhost:3000/api/corsair/oauth/callback is added under Authorized redirect URIs in Google Cloud Console.",
  },
  invalid_grant: {
    title: "Authorization Token Expired",
    description:
      "Google refresh token expired or revoked. Please try connecting your account again.",
  },
  access_denied: {
    title: "Authorization Cancelled",
    description:
      "You cancelled or denied permissions during Google OAuth sign-in.",
  },
  missing_state: {
    title: "Invalid OAuth Request",
    description:
      "The OAuth connection request was missing a valid state parameter.",
  },
  invalid_or_expired_link: {
    title: "Connection Link Expired",
    description:
      "The integration connection link expired. Please try connecting again.",
  },
  oauth_callback_failed: {
    title: "OAuth Connection Failed",
    description:
      "Failed to process Google OAuth callback. Check server logs or app environment variables.",
  },
};

export function OAuthToastListener() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const connectError = searchParams.get("connect_error");
    const connected = searchParams.get("connected");

    if (!connectError && !connected) return;

    if (connectError) {
      const known = ERROR_MESSAGES[connectError];
      if (known) {
        toast.error(known.title, {
          description: known.description,
          duration: 10_000,
        });
      } else {
        toast.error("Connection Failed", {
          description: `Google connection failed: ${connectError}`,
          duration: 8_000,
        });
      }
    } else if (connected) {
      const serviceName =
        connected === "gmail"
          ? "Gmail"
          : connected === "googlecalendar"
            ? "Google Calendar"
            : connected;

      toast.success(`${serviceName} Connected`, {
        description: `Your ${serviceName} account was connected successfully!`,
        duration: 5_000,
      });
    }

    // Clean search params from URL after displaying toast
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("connect_error");
    nextUrl.searchParams.delete("connected");
    router.replace(nextUrl.pathname + nextUrl.search);
  }, [searchParams, router]);

  return null;
}
