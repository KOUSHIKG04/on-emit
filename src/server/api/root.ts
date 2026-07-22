import { accountRouter } from "@/server/api/routers/account";
import { createTRPCRouter } from "@/server/api/trpc";
import { integrationsRouter } from "@/server/api/routers/integrations";
import { calendarRouter } from "@/server/api/routers/calendar";
import { gmailRouter } from "@/server/api/routers/gmail";
import { agentRouter } from "@/server/api/routers/agent";
import { aiSettingsRouter } from "@/server/api/routers/ai-settings";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  agent: agentRouter,
  aiSettings: aiSettingsRouter,
  account: accountRouter,
  // post: postRouter,
  integrations: integrationsRouter,
  gmail: gmailRouter,
  calendar: calendarRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
