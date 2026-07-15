import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";

const connectablePlugin = z.enum(["gmail", "googlecalendar"]);

export const integrationsRouter = createTRPCRouter({
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
