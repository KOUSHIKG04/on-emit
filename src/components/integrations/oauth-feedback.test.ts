import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cleanOAuthFeedbackUrl, getOAuthFeedback } from "./oauth-feedback";

function feedback(search: string) {
  return getOAuthFeedback(new URLSearchParams(search));
}

void describe("OAuth connection feedback", () => {
  void it("describes successful Gmail connections", () => {
    assert.deepEqual(feedback("connected=gmail"), {
      description: "Your Gmail account was connected successfully!",
      duration: 5_000,
      id: "oauth-success:gmail",
      title: "Gmail Connected",
      type: "success",
    });
  });

  void it("describes successful Google Calendar connections", () => {
    assert.deepEqual(feedback("connected=googlecalendar"), {
      description: "Your Google Calendar account was connected successfully!",
      duration: 5_000,
      id: "oauth-success:googlecalendar",
      title: "Google Calendar Connected",
      type: "success",
    });
  });

  void it("describes cancelled authorization", () => {
    assert.equal(
      feedback("connect_error=access_denied")?.title,
      "Authorization Cancelled",
    );
  });

  void it("describes expired connection links", () => {
    assert.equal(
      feedback("connect_error=invalid_or_expired_link")?.title,
      "Connection Link Expired",
    );
  });

  void it("describes Google OAuth configuration errors", () => {
    const result = feedback("connect_error=redirect_uri_mismatch");

    assert.equal(result?.title, "Google OAuth Configuration Mismatch");
    assert.match(result?.description ?? "", /authorized redirect URIs/);
  });

  void it("gives callback errors precedence over success parameters", () => {
    assert.equal(
      feedback("connected=gmail&connect_error=access_denied")?.type,
      "error",
    );
  });

  void it("removes only one-time OAuth parameters and preserves hash state", () => {
    const url = new URL(
      "http://localhost:3000/settings?connected=gmail&view=integrations#connections",
    );

    assert.equal(
      cleanOAuthFeedbackUrl(url),
      "/settings?view=integrations#connections",
    );
  });
});
