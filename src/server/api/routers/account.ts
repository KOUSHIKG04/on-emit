import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const accountRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ({
    userId: ctx.userId,
    corsairTenantId: ctx.userId,
  })),
});
