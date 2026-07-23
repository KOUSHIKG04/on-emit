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
    assert.equal(getDefaultAiModel(DEFAULT_AI_PROVIDER), "gemini-2.5-flash");
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
