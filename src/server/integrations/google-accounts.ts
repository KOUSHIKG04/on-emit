import { and, asc, eq } from "drizzle-orm";

import type { db } from "@/server/db";
import { corsairGoogleAccounts } from "@/server/db/schema";

export type Database = typeof db;

export function createCorsairGoogleTenantId(userId: string, accountId: string) {
  return `${userId}:google:${accountId}`;
}

export function isMissingGoogleAccountsSchema(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return false;

    const value = current as {
      cause?: unknown;
      code?: unknown;
      message?: unknown;
    };
    if (value.code === "42P01") return true;
    if (
      typeof value.message === "string" &&
      /relation ["']?corsair_google_accounts["']? does not exist/i.test(
        value.message,
      )
    ) {
      return true;
    }

    current = value.cause;
  }

  return false;
}

export async function getActiveGoogleAccount(
  database: Database,
  userId: string,
) {
  try {
    const [active] = await database
      .select()
      .from(corsairGoogleAccounts)
      .where(
        and(
          eq(corsairGoogleAccounts.userId, userId),
          eq(corsairGoogleAccounts.isActive, true),
        ),
      )
      .orderBy(asc(corsairGoogleAccounts.createdAt))
      .limit(1);

    if (active) return active;

    const [first] = await database
      .select()
      .from(corsairGoogleAccounts)
      .where(eq(corsairGoogleAccounts.userId, userId))
      .orderBy(asc(corsairGoogleAccounts.createdAt))
      .limit(1);

    return first;
  } catch (error) {
    if (isMissingGoogleAccountsSchema(error)) return undefined;
    throw error;
  }
}

export async function getActiveCorsairTenantId(
  database: Database,
  userId: string,
) {
  const active = await getActiveGoogleAccount(database, userId);
  return active?.corsairTenantId ?? userId;
}

export async function listGoogleAccounts(database: Database, userId: string) {
  try {
    return await database
      .select()
      .from(corsairGoogleAccounts)
      .where(eq(corsairGoogleAccounts.userId, userId))
      .orderBy(asc(corsairGoogleAccounts.createdAt));
  } catch (error) {
    if (isMissingGoogleAccountsSchema(error)) return [];
    throw error;
  }
}

export async function getGoogleAccountOwnerUserId(
  database: Database,
  corsairTenantId: string,
) {
  try {
    const [account] = await database
      .select({ userId: corsairGoogleAccounts.userId })
      .from(corsairGoogleAccounts)
      .where(eq(corsairGoogleAccounts.corsairTenantId, corsairTenantId))
      .limit(1);

    return account?.userId ?? corsairTenantId;
  } catch (error) {
    if (isMissingGoogleAccountsSchema(error)) return corsairTenantId;
    throw error;
  }
}
