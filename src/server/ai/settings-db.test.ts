import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isMissingAiSettingsSchema } from "./settings-db";

void describe("AI settings schema errors", () => {
  void it("recognizes PostgreSQL undefined-table errors", () => {
    assert.equal(isMissingAiSettingsSchema({ code: "42P01" }), true);
  });

  void it("recognizes wrapped missing AI settings errors", () => {
    assert.equal(
      isMissingAiSettingsSchema({
        cause: {
          message: 'relation "corsair_ai_settings" does not exist',
        },
      }),
      true,
    );
  });

  void it("does not swallow unrelated database errors", () => {
    assert.equal(isMissingAiSettingsSchema({ code: "23505" }), false);
  });
});
