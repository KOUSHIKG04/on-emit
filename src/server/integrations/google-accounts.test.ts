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

void test("getActiveGoogleAccount returns active account or fallback", async () => {
  const mockAccount = {
    id: "acc-1",
    userId: "user-1",
    corsairTenantId: "user-1:google:acc-1",
    label: "Work",
    isActive: true,
  };

  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({
            limit: () => Promise.resolve([mockAccount]),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<
    typeof import("./google-accounts").getActiveGoogleAccount
  >[0];

  const active = await (
    await import("./google-accounts")
  ).getActiveGoogleAccount(mockDb, "user-1");
  assert.deepEqual(active, mockAccount);
});

void test("getActiveCorsairTenantId returns fallback user id when missing schema", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => {
          throw Object.assign(new Error("Missing Google accounts table."), {
            code: "42P01",
          });
        },
      }),
    }),
  } as unknown as Parameters<
    typeof import("./google-accounts").getActiveCorsairTenantId
  >[0];

  const tenantId = await (
    await import("./google-accounts")
  ).getActiveCorsairTenantId(mockDb, "user-1");
  assert.equal(tenantId, "user-1");
});

void test("listGoogleAccounts returns empty array on missing schema error", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => {
          throw Object.assign(new Error("Missing Google accounts table."), {
            code: "42P01",
          });
        },
      }),
    }),
  } as unknown as Parameters<
    typeof import("./google-accounts").listGoogleAccounts
  >[0];

  const accounts = await (
    await import("./google-accounts")
  ).listGoogleAccounts(mockDb, "user-1");
  assert.deepEqual(accounts, []);
});

void test("getGoogleAccountOwnerUserId resolves owner or defaults to tenant id", async () => {
  const mockDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([{ userId: "owner-123" }]),
        }),
      }),
    }),
  } as unknown as Parameters<
    typeof import("./google-accounts").getGoogleAccountOwnerUserId
  >[0];

  const owner = await (
    await import("./google-accounts")
  ).getGoogleAccountOwnerUserId(mockDb, "tenant-abc");
  assert.equal(owner, "owner-123");
});
