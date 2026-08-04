import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair, getCorsairConnectionStatus } from "@/server/corsair";
import {
  corsairAccounts,
  corsairEmailPriorities,
  corsairEntities,
  corsairEvents,
  corsairGoogleAccounts,
} from "@/server/db/schema";
import {
  createCorsairGoogleTenantId,
  isMissingGoogleAccountsSchema,
  listGoogleAccounts,
  type Database,
} from "@/server/integrations/google-accounts";
import { createWebhookTenantToken } from "@/server/webhooks/tenant-token";

const connectablePlugin = z.enum(["gmail", "googlecalendar"]);
const accountId = z.string().trim().min(1).max(100);

function schemaRequiredError(error: unknown) {
  if (!isMissingGoogleAccountsSchema(error)) return undefined;

  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message:
      "Multiple Google accounts require the latest database migration. Run npm run db:migrate, then try again.",
    cause: error,
  });
}

async function resolveTenantId(
  ctx: {
    db: Database;
    userId: string;
    corsairTenantId: string;
  },
  requestedAccountId?: string,
) {
  if (!requestedAccountId) return ctx.corsairTenantId;
  if (requestedAccountId === "legacy") return ctx.userId;

  const [account] = await ctx.db
    .select({ corsairTenantId: corsairGoogleAccounts.corsairTenantId })
    .from(corsairGoogleAccounts)
    .where(
      and(
        eq(corsairGoogleAccounts.id, requestedAccountId),
        eq(corsairGoogleAccounts.userId, ctx.userId),
      ),
    )
    .limit(1);

  if (!account) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Google account was not found.",
    });
  }

  return account.corsairTenantId;
}

export const integrationsRouter = createTRPCRouter({
  webhookConfig: protectedProcedure
    .input(z.object({ accountId: accountId.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const tenantId = await resolveTenantId(ctx, input?.accountId);

      const url = new URL("/api/webhooks/corsair", env.APP_URL);
      url.searchParams.set("tenantId", tenantId);
      url.searchParams.set("token", createWebhookTenantToken(tenantId));

      return { url: url.toString() };
    }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const storedAccounts = await listGoogleAccounts(ctx.db, ctx.userId);
    const accounts =
      storedAccounts.length > 0
        ? storedAccounts
        : [
            {
              id: "legacy",
              userId: ctx.userId,
              corsairTenantId: ctx.userId,
              label: "Primary Google account",
              isActive: true,
              createdAt: new Date(0),
              updatedAt: new Date(0),
            },
          ];

    const accountStatuses = await Promise.all(
      accounts.map(async (account) => {
        const status = await getCorsairConnectionStatus(
          account.corsairTenantId,
        );

        return {
          id: account.id,
          label: account.label,
          isActive:
            account.corsairTenantId === ctx.corsairTenantId ||
            (storedAccounts.length === 0 && account.id === "legacy"),
          gmail: status.gmail ?? "not_connected",
          googleCalendar: status.googlecalendar ?? "not_connected",
        };
      }),
    );
    const activeAccount =
      accountStatuses.find((account) => account.isActive) ??
      accountStatuses[0]!;

    return {
      activeAccountId: activeAccount.id,
      accounts: accountStatuses,
      gmail: activeAccount.gmail,
      googleCalendar: activeAccount.googleCalendar,
    };
  }),

  createGoogleAccount: protectedProcedure
    .input(
      z.object({
        label: z.string().trim().min(1).max(80).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const id = crypto.randomUUID();
        const [created] = await ctx.db.transaction(async (transaction) => {
          const existing = await transaction
            .select()
            .from(corsairGoogleAccounts)
            .where(eq(corsairGoogleAccounts.userId, ctx.userId));

          if (existing.length >= 10) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You can connect up to 10 Google accounts.",
            });
          }

          await transaction
            .update(corsairGoogleAccounts)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(corsairGoogleAccounts.userId, ctx.userId));

          return transaction
            .insert(corsairGoogleAccounts)
            .values({
              id,
              userId: ctx.userId,
              corsairTenantId: createCorsairGoogleTenantId(ctx.userId, id),
              label: input.label ?? `Google account ${existing.length + 1}`,
              isActive: true,
            })
            .returning();
        });

        return {
          id: created!.id,
          label: created!.label,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const migrationError = schemaRequiredError(error);
        if (migrationError) throw migrationError;
        throw error;
      }
    }),

  selectGoogleAccount: protectedProcedure
    .input(z.object({ accountId }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.accountId === "legacy") {
          return { activeAccountId: "legacy" };
        }

        const [owned] = await ctx.db
          .select({ id: corsairGoogleAccounts.id })
          .from(corsairGoogleAccounts)
          .where(
            and(
              eq(corsairGoogleAccounts.id, input.accountId),
              eq(corsairGoogleAccounts.userId, ctx.userId),
            ),
          )
          .limit(1);

        if (!owned) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Google account was not found.",
          });
        }

        await ctx.db.transaction(async (transaction) => {
          await transaction
            .update(corsairGoogleAccounts)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(corsairGoogleAccounts.userId, ctx.userId));
          await transaction
            .update(corsairGoogleAccounts)
            .set({ isActive: true, updatedAt: new Date() })
            .where(
              and(
                eq(corsairGoogleAccounts.id, input.accountId),
                eq(corsairGoogleAccounts.userId, ctx.userId),
              ),
            );
        });

        return { activeAccountId: input.accountId };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const migrationError = schemaRequiredError(error);
        if (migrationError) throw migrationError;
        throw error;
      }
    }),

  removeGoogleAccount: protectedProcedure
    .input(z.object({ accountId }))
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.accountId === "legacy") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The legacy account cannot be removed here.",
          });
        }

        return await ctx.db.transaction(async (transaction) => {
          const accounts = await transaction
            .select()
            .from(corsairGoogleAccounts)
            .where(eq(corsairGoogleAccounts.userId, ctx.userId));
          const account = accounts.find(
            (candidate) => candidate.id === input.accountId,
          );

          if (!account) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Google account was not found.",
            });
          }

          const linkedCorsairAccounts = await transaction
            .select({ id: corsairAccounts.id })
            .from(corsairAccounts)
            .where(eq(corsairAccounts.tenantId, account.corsairTenantId));
          const linkedAccountIds = linkedCorsairAccounts.map(({ id }) => id);

          if (linkedAccountIds.length > 0) {
            await transaction
              .delete(corsairEntities)
              .where(inArray(corsairEntities.accountId, linkedAccountIds));
            await transaction
              .delete(corsairEvents)
              .where(inArray(corsairEvents.accountId, linkedAccountIds));
            await transaction
              .delete(corsairAccounts)
              .where(inArray(corsairAccounts.id, linkedAccountIds));
          }

          await transaction
            .delete(corsairEmailPriorities)
            .where(
              eq(corsairEmailPriorities.tenantId, account.corsairTenantId),
            );
          await transaction
            .delete(corsairGoogleAccounts)
            .where(
              and(
                eq(corsairGoogleAccounts.id, input.accountId),
                eq(corsairGoogleAccounts.userId, ctx.userId),
              ),
            );

          const remainingAccounts = accounts.filter(
            (candidate) => candidate.id !== input.accountId,
          );
          const replacement =
            remainingAccounts.find((candidate) => candidate.isActive) ??
            remainingAccounts[0];
          if (account.isActive && replacement) {
            await transaction
              .update(corsairGoogleAccounts)
              .set({ isActive: true, updatedAt: new Date() })
              .where(
                and(
                  eq(corsairGoogleAccounts.id, replacement.id),
                  eq(corsairGoogleAccounts.userId, ctx.userId),
                ),
              );
          }

          return {
            removedAccountId: account.id,
            activeAccountId: replacement?.id ?? "legacy",
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        const migrationError = schemaRequiredError(error);
        if (migrationError) throw migrationError;
        throw error;
      }
    }),

  connect: protectedProcedure
    .input(
      z.object({
        plugin: connectablePlugin,
        accountId: accountId.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = await resolveTenantId(ctx, input.accountId);

        const link = await corsair.manage.connect.createLink({
          plugin: input.plugin,
          tenantId,
        });

        return {
          connectUrl: link.connectUrl,
          expiresAt: link.expiresAt ?? null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error(
          `Failed to create ${input.plugin} connection link:`,
          error,
        );

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "Corsair could not start the connection. Check the OAuth credentials and application URL.",
          cause: error,
        });
      }
    }),
});
