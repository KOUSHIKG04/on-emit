import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";
import { env } from "@/env";
import { createWebhookTenantToken } from "@/server/webhooks/tenant-token";

const connectablePlugin = z.enum(["gmail", "googlecalendar"]);

export const integrationsRouter = createTRPCRouter({
  webhookConfig: protectedProcedure.query(({ ctx }) => {
    const url = new URL("/api/webhooks/corsair", env.APP_URL);
    url.searchParams.set("tenantId", ctx.userId);
    url.searchParams.set("token", createWebhookTenantToken(ctx.userId));

    return { url: url.toString() };
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const status = await corsair.manage.connectionStatus.get({
      tenantId: ctx.userId,
    });

    return {
      gmail: status.gmail ?? "not_connected",
      googleCalendar: status.googlecalendar ?? "not_connected",
    };
  }),

  connect: protectedProcedure
    .input(
      z.object({
        plugin: connectablePlugin,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const link = await corsair.manage.connect.createLink({
          plugin: input.plugin,
          tenantId: ctx.userId,
        });

        return {
          connectUrl: link.connectUrl,
          expiresAt: link.expiresAt ?? null,
        };
      } catch (error) {
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
