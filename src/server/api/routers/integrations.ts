import { corsair } from "@/server/corsair";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
});
