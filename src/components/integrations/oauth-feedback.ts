type OAuthFeedback = {
  description: string;
  duration: number;
  id: string;
  title: string;
  type: "error" | "success";
};

const ERROR_MESSAGES: Record<string, { description: string; title: string }> = {
  redirect_uri_mismatch: {
    title: "Google OAuth Configuration Mismatch",
    description:
      "The Google OAuth redirect URI does not match this app. Add this app's /api/corsair/oauth/callback URL to the authorized redirect URIs in Google Cloud Console.",
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
  missing_callback_data: {
    title: "Invalid OAuth Callback",
    description:
      "Google did not return the information needed to finish connecting your account. Please try connecting again.",
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

const SERVICE_NAMES: Record<string, string> = {
  gmail: "Gmail",
  googlecalendar: "Google Calendar",
};

export function getOAuthFeedback(
  searchParams: Pick<URLSearchParams, "get">,
): OAuthFeedback | null {
  const connectError = searchParams.get("connect_error");
  const connected = searchParams.get("connected");

  if (connectError) {
    const known = ERROR_MESSAGES[connectError];

    return known
      ? {
          ...known,
          duration: 10_000,
          id: `oauth-error:${connectError}`,
          type: "error",
        }
      : {
          description: `Google connection failed: ${connectError}`,
          duration: 8_000,
          id: `oauth-error:${connectError}`,
          title: "Connection Failed",
          type: "error",
        };
  }

  if (!connected) return null;

  const serviceName = SERVICE_NAMES[connected] ?? connected;

  return {
    description: `Your ${serviceName} account was connected successfully!`,
    duration: 5_000,
    id: `oauth-success:${connected}`,
    title: `${serviceName} Connected`,
    type: "success",
  };
}

export function cleanOAuthFeedbackUrl(url: URL) {
  const nextUrl = new URL(url);
  nextUrl.searchParams.delete("connect_error");
  nextUrl.searchParams.delete("connected");

  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}
