import {
  Agent,
  OpenAIProvider,
  Runner,
  tool,
  type AgentInputItem,
} from "@openai/agents";
import { OpenAIAgentsProvider } from "@corsair-dev/mcp";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import {
  DEFAULT_AI_PROVIDER,
  getAiProviderLabel,
  getDefaultAiModel,
  isAiProvider,
  type AiProvider,
} from "@/lib/ai-providers";
import { decryptApiKey } from "@/server/ai/api-key-crypto";
import { isMissingAiSettingsSchema } from "@/server/ai/settings-db";
import { getTenantCorsair } from "@/server/corsair";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsairAiProviderKeys, corsairAiSettings } from "@/server/db/schema";

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
  })
  .refine((input) => input.message.length > 0 || input.attachments.length > 0, {
    message: "Enter a request or attach an image.",
    path: ["message"],
  });

const AGENT_TIMEOUT_MS = 60_000;
const PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1/",
};
const QUEUE_ACTION_MARKER = "[QUEUE_ACTION]";
const WRITE_TOOL_NAME_PATTERN =
  /(send|draft|create|update|delete|modify|archive|trash|untrash|reply|forward|move|mark|schedule|cancel)/i;

export const agentRouter = createTRPCRouter({
  chat: protectedProcedure.input(chatInput).mutation(async ({ ctx, input }) => {
    let settings: typeof corsairAiSettings.$inferSelect | undefined;

    try {
      [settings] = await ctx.db
        .select()
        .from(corsairAiSettings)
        .where(eq(corsairAiSettings.userId, ctx.userId))
        .limit(1);
    } catch (error) {
      if (!isMissingAiSettingsSchema(error)) throw error;
    }

    const usingByok = settings?.source === "byok";
    const provider =
      usingByok && isAiProvider(settings?.provider)
        ? settings.provider
        : DEFAULT_AI_PROVIDER;
    const providerLabel = getAiProviderLabel(provider);
    const model = usingByok
      ? (settings?.model ?? getDefaultAiModel(provider))
      : env.GEMINI_AGENT_MODEL;
    let encryptedApiKey: string | null | undefined;

    if (usingByok) {
      const [providerKey] = await ctx.db
        .select({
          encryptedApiKey: corsairAiProviderKeys.encryptedApiKey,
        })
        .from(corsairAiProviderKeys)
        .where(
          and(
            eq(corsairAiProviderKeys.userId, ctx.userId),
            eq(corsairAiProviderKeys.provider, provider),
          ),
        )
        .limit(1);

      encryptedApiKey =
        providerKey?.encryptedApiKey ?? settings?.encryptedApiKey;
    }

    let apiKey = usingByok ? undefined : env.GEMINI_API_KEY;
    if (encryptedApiKey) {
      try {
        apiKey = decryptApiKey(encryptedApiKey);
      } catch (error) {
        console.error(
          `Could not decrypt the saved ${providerLabel} key:`,
          error,
        );
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Replace your saved ${providerLabel} API key in Settings.`,
        });
      }
    }

    if (!apiKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Add a ${providerLabel} API key in Settings to use agent chat.`,
      });
    }

    const modelProvider = new OpenAIProvider({
      apiKey,
      baseURL: PROVIDER_BASE_URLS[provider],
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
        corsair: getTenantCorsair(ctx.corsairTenantId),
        tenantId: ctx.corsairTenantId,
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
        provider,
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new TRPCError({
          code: "TIMEOUT",
          message: `${providerLabel} exceeded the 60-second time limit.`,
        });
      }

      if (error instanceof TRPCError) throw error;

      console.error(`Corsair ${providerLabel} agent failed:`, error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (
        /api.?key|authentication|unauthorized|\b401\b|\b403\b/i.test(
          errorMessage,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${providerLabel} rejected the API key. Update it in Settings.`,
        });
      }
      if (/rate.?limit|quota|\b429\b/i.test(errorMessage)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `${providerLabel} is rate limited. Try again shortly.`,
        });
      }

      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: `${providerLabel} could not complete this request.`,
      });
    } finally {
      clearTimeout(timeout);
      await modelProvider.close().catch(() => undefined);
    }
  }),
});
