import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getSafeNextPath, isProtectedWorkspacePath } from "./safe-next-path";

void describe("workspace authentication paths", () => {
  void it("accepts known workspace destinations", () => {
    assert.equal(getSafeNextPath("/focus"), "/focus");
    assert.equal(
      getSafeNextPath("/search?q=from%3Ateam"),
      "/search?q=from%3Ateam",
    );
    assert.equal(getSafeNextPath("/settings/ai"), "/settings/ai");
    assert.equal(getSafeNextPath("/analytics"), "/analytics");
  });

  void it("rejects external and public destinations", () => {
    assert.equal(getSafeNextPath("https://example.com"), "/focus");
    assert.equal(getSafeNextPath("//example.com/focus"), "/focus");
    assert.equal(getSafeNextPath("/login"), "/focus");
    assert.equal(getSafeNextPath(undefined), "/focus");
  });

  void it("identifies every protected workspace route", () => {
    for (const pathname of [
      "/focus",
      "/inbox",
      "/calendar",
      "/search",
      "/agent",
      "/analytics",
      "/settings",
    ]) {
      assert.equal(isProtectedWorkspacePath(pathname), true);
    }

    assert.equal(isProtectedWorkspacePath("/"), false);
    assert.equal(isProtectedWorkspacePath("/login"), false);
    assert.equal(isProtectedWorkspacePath("/api/realtime"), false);
  });
});
