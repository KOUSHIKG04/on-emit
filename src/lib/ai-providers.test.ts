import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_AI_PROVIDER,
  getAiModelLabel,
  getDefaultAiModel,
  isAiProvider,
} from "./ai-providers";

void describe("AI providers", () => {
  void it("keeps Gemini as the default free provider", () => {
    assert.equal(DEFAULT_AI_PROVIDER, "gemini");
    assert.equal(
      getDefaultAiModel(DEFAULT_AI_PROVIDER),
      "gemini-3.5-flash-lite",
    );
    assert.deepEqual(
      AI_PROVIDER_OPTIONS[0].models.map(({ id }) => id),
      [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3-flash-preview",
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
      ],
    );
  });

  void it("supports every requested BYOK provider", () => {
    assert.deepEqual(
      AI_PROVIDER_OPTIONS.map(({ id }) => id),
      ["gemini", "openrouter", "openai", "anthropic"],
    );
  });

  void it("validates provider values", () => {
    assert.equal(isAiProvider("openrouter"), true);
    assert.equal(isAiProvider("unknown"), false);
  });

  void it("preserves custom provider model IDs", () => {
    assert.equal(
      getAiModelLabel("openrouter", "vendor/custom-model"),
      "vendor/custom-model",
    );
  });
});
