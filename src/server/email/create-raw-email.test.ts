import assert from "node:assert/strict";
import test from "node:test";

import { createRawEmail } from "./create-raw-email";
import { parseGmailRaw } from "./parse-email";

void test("creates a safe RFC-compliant Gmail message", async () => {
  const body = `Hello,\n\n${"A".repeat(240)}\n\nRegards,\nOn Emit`;
  const raw = createRawEmail({
    to: ["friend@example.com\r\nBcc: attacker@example.com"],
    cc: ["team@example.com"],
    subject: "Planning update ✓",
    body,
  });
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  const [headerBlock, encodedBody = ""] = mime.split("\r\n\r\n");

  assert.ok(headerBlock);
  assert.doesNotMatch(headerBlock, /\r\nBcc:/i);
  assert.match(headerBlock, /Content-Transfer-Encoding: base64/i);
  assert.ok(
    encodedBody.split("\r\n").every((line) => line.length <= 76),
    "base64 body lines must not exceed 76 characters",
  );

  const parsed = await parseGmailRaw(raw);
  assert.equal(parsed.subject, "Planning update ✓");
  assert.equal(parsed.text, body.replace(/\n/g, "\r\n"));
  assert.equal(parsed.cc?.[0]?.address, "team@example.com");
});
