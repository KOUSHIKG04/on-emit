import assert from "node:assert/strict";
import test from "node:test";

import {
  createCorsairGoogleTenantId,
  isMissingGoogleAccountsSchema,
} from "./google-accounts";

void test("creates a separate Corsair tenant for every Google account slot", () => {
  const first = createCorsairGoogleTenantId("user-1", "account-1");
  const second = createCorsairGoogleTenantId("user-1", "account-2");

  assert.equal(first, "user-1:google:account-1");
  assert.notEqual(first, second);
});

void test("recognizes a missing Google accounts table by Postgres code", () => {
  assert.equal(isMissingGoogleAccountsSchema({ code: "42P01" }), true);
  assert.equal(isMissingGoogleAccountsSchema({ code: "23505" }), false);
});

void test("recognizes wrapped missing-table errors", () => {
  assert.equal(
    isMissingGoogleAccountsSchema({
      cause: {
        message: 'relation "corsair_google_accounts" does not exist',
      },
    }),
    true,
  );
});
