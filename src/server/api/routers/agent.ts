import {
  Agent,
  OpenAIProvider,
  Runner,
  tool,
  type AgentInputItem,
} from "@openai/agents";
import { OpenAIAgentsProvider } from "@corsair-dev/mcp";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { isGeminiModel } from "@/lib/gemini";
import { decryptApiKey } from "@/server/ai/api-key-crypto";
import { getTenantCorsair } from "@/server/corsair";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsairAiSettings } from "@/server/db/schema";

const geminiModelSchema = z.enum(["gemini-3.5-flash", "gemini-3.5-flash-lite"]);

const imageAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataUrl: z
    .string()
    .max(3_500_000)
    .regex(/^data:image\/(?:jpeg|png|webp|gif);base64,/),
});

const chatInput = z
  .object({
    message: z.string().trim().max(4_000),
    attachments: z.array(imageAttachmentSchema).max(3).default([]),
    confirmed: z.boolean().default(false),
    model: geminiModelSchema.optional(),
  })
  .refine((input) => input.message.length > 0 || input.attachments.length > 0, {
    message: "Enter a request or attach an image.",
    path: ["message"],
  });

const AGENT_TIMEOUT_MS = 60_000;
const GEMINI_OPENAI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/";
const QUEUE_ACTION_MARKER = "[QUEUE_ACTION]";
const WRITE_TOOL_NAME_PATTERN =
  /(send|draft|create|update|delete|modify|archive|trash|untrash|reply|forward|move|mark|schedule|cancel)/i;

export const agentRouter = createTRPCRouter({
  chat: protectedProcedure.input(chatInput).mutation(async ({ ctx, input }) => {
    const [settings] = await ctx.db
      .select()
      .from(corsairAiSettings)
      .where(eq(corsairAiSettings.userId, ctx.userId))
      .limit(1);

    let apiKey = env.GEMINI_API_KEY;
    if (settings?.encryptedApiKey) {
      try {
        apiKey = decryptApiKey(settings.encryptedApiKey);
      } catch (error) {
        console.error("Could not decrypt the saved Gemini key:", error);
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Replace your saved Gemini API key in Settings.",
        });
      }
    }

    if (!apiKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Add a Gemini API key in Settings to use agent chat.",
      });
    }

    const usingByok = Boolean(settings?.encryptedApiKey);
    const model = usingByok
      ? (input.model ??
        (isGeminiModel(settings?.model)
          ? settings.model
          : env.GEMINI_AGENT_MODEL))
      : env.GEMINI_AGENT_MODEL;
    const modelProvider = new OpenAIProvider({
      apiKey,
      baseURL: GEMINI_OPENAI_BASE_URL,
      useResponses: false,
    });
    const runner = new Runner({
      modelProvider,
      tracingDisabled: true,
    });
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
            (item) => !WRITE_TOOL_NAME_PATTERN.test(item.name),
          );

      const agent = new Agent({
        name: "On Emit assistant",
        model,
        tools: safeTools,
        instructions: `You manage Gmail and Google Calendar through Corsair for one authenticated tenant.
Be concise and state exactly what you did. Never claim an action succeeded unless a tool result confirms it.
Current date and time: ${new Date().toISOString()}.
${
  input.confirmed
    ? "The user explicitly approved this queued action. Use the available write tools to complete it now."
    : `Read-only tools are available and read-only requests must be completed immediately. Write tools are unavailable. If the request needs an external write such as sending or drafting email, archiving mail, or changing the calendar, preview the exact action and begin the final response with exactly ${QUEUE_ACTION_MARKER}. Never use that marker for a read-only request.`
}`,
      });

      const agentInput: AgentInputItem[] = [
        {
          role: "user",
          content: [
            ...(input.message
              ? [{ type: "input_text" as const, text: input.message }]
              : []),
            ...input.attachments.map((attachment) => ({
              type: "input_image" as const,
              image: attachment.dataUrl,
              detail: "auto",
            })),
          ],
        },
      ];
      const result = await runner.run(agent, agentInput, {
        maxTurns: 8,
        signal: timeoutController.signal,
      });
      const rawReply = String(
        result.finalOutput ?? "No response was produced.",
      );
      const requiresApproval =
        !input.confirmed &&
        rawReply.trimStart().startsWith(QUEUE_ACTION_MARKER);
      const reply = requiresApproval
        ? rawReply.trimStart().slice(QUEUE_ACTION_MARKER.length).trimStart()
        : rawReply;

      return {
        reply,
        requiresApproval,
        model,
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new TRPCError({
          code: "TIMEOUT",
          message: "Gemini exceeded the 60-second time limit.",
        });
      }

      if (error instanceof TRPCError) throw error;

      console.error("Corsair Gemini agent failed:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (
        /api.?key|authentication|unauthorized|\b401\b|\b403\b/i.test(
          errorMessage,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gemini rejected the API key. Update it in Settings.",
        });
      }
      if (/rate.?limit|quota|\b429\b/i.test(errorMessage)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Gemini is rate limited. Try again shortly.",
        });
      }

      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Gemini could not complete this request.",
      });
    } finally {
      clearTimeout(timeout);
      await modelProvider.close().catch(() => undefined);
    }
  }),
});
