import { Agent, run, tool } from "@openai/agents";
import { OpenAIAgentsProvider } from "@corsair-dev/mcp";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { getTenantCorsair } from "@/server/corsair";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const chatInput = z.object({
  message: z.string().trim().min(1).max(4_000),
  confirmed: z.boolean().default(false),
});

const AGENT_TIMEOUT_MS = 60_000;

export const agentRouter = createTRPCRouter({
  chat: protectedProcedure.input(chatInput).mutation(async ({ ctx, input }) => {
    if (!env.OPENAI_API_KEY) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Add OPENAI_API_KEY to use Corsair agent chat.",
      });
    }

    const timeoutController = new AbortController();
    const timeout = setTimeout(
      () => timeoutController.abort(),
      AGENT_TIMEOUT_MS,
    );

    try {
      const corsairTools = new OpenAIAgentsProvider().build({
        corsair: getTenantCorsair(ctx.userId),
        tenantId: ctx.userId,
        setup: false,
        tool,
      });
      const safeTools = input.confirmed
        ? corsairTools
        : corsairTools.filter(
            (item) =>
              !/(send|create|update|delete|modify|trash|untrash)/i.test(
                item.name,
              ),
          );

      const agent = new Agent({
        name: "On Emit assistant",
        model: env.OPENAI_AGENT_MODEL,
        tools: safeTools,
        instructions: `You manage Gmail and Google Calendar through Corsair for one authenticated tenant.
Be concise and state exactly what you did. Never claim an action succeeded unless a tool result confirms it.
Current date and time: ${new Date().toISOString()}.
${input.confirmed ? "The user explicitly confirmed external writes for this request." : "This request is preview-only. Explain the proposed email or calendar action and ask the user to confirm; write tools are unavailable."}`,
      });

      const result = await run(agent, input.message, {
        maxTurns: 8,
        signal: timeoutController.signal,
      });
      return {
        reply: String(result.finalOutput ?? "No response was produced."),
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new TRPCError({
          code: "TIMEOUT",
          message: "The Corsair agent exceeded the 60-second time limit.",
        });
      }

      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Corsair MCP agent failed:", error);
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "The Corsair agent could not complete this request.",
      });
    } finally {
      clearTimeout(timeout);
    }
  }),
});
