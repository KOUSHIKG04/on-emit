import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import {
  DEFAULT_AI_PROVIDER,
  getDefaultAiModel,
  isAiProvider,
} from "@/lib/ai-providers";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsairAiProviderKeys, corsairAiSettings } from "@/server/db/schema";
import { encryptApiKey } from "@/server/ai/api-key-crypto";
import { isMissingAiSettingsSchema } from "@/server/ai/settings-db";

const aiProviderSchema = z.enum([
  "gemini",
  "openrouter",
  "openai",
  "anthropic",
]);

const updateSettingsInput = z.object({
  source: z.enum(["default", "byok"]),
  provider: aiProviderSchema,
  model: z.string().trim().min(1).max(160),
  apiKey: z.string().trim().min(20).max(500).optional(),
});

export const aiSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    let settings: typeof corsairAiSettings.$inferSelect | undefined;
    let providerKeys: Array<{ provider: string }> = [];

    try {
      [[settings], providerKeys] = await Promise.all([
        ctx.db
          .select()
          .from(corsairAiSettings)
          .where(eq(corsairAiSettings.userId, ctx.userId))
          .limit(1),
        ctx.db
          .select({ provider: corsairAiProviderKeys.provider })
          .from(corsairAiProviderKeys)
          .where(eq(corsairAiProviderKeys.userId, ctx.userId)),
      ]);
    } catch (error) {
      if (!isMissingAiSettingsSchema(error)) throw error;
    }

    const provider = isAiProvider(settings?.provider)
      ? settings.provider
      : DEFAULT_AI_PROVIDER;
    const source = settings?.source === "byok" ? "byok" : "default";
    const savedProviders = providerKeys
      .map(({ provider: savedProvider }) => savedProvider)
      .filter(isAiProvider);

    if (settings?.encryptedApiKey && !savedProviders.includes(provider)) {
      savedProviders.push(provider);
    }

    return {
      provider,
      model:
        source === "byok"
          ? (settings?.model ?? getDefaultAiModel(provider))
          : env.GEMINI_AGENT_MODEL,
      defaultModel: env.GEMINI_AGENT_MODEL,
      source,
      hasPrivateKey: source === "byok" && savedProviders.includes(provider),
      savedProviders,
      hasDefaultKey: Boolean(env.GEMINI_API_KEY),
    } as const;
  }),

  update: protectedProcedure
    .input(updateSettingsInput)
    .mutation(async ({ ctx, input }) => {
      if (input.source === "default") {
        if (!env.GEMINI_API_KEY) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No app Gemini key is configured. Use your own key.",
          });
        }

        if (input.provider !== DEFAULT_AI_PROVIDER) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The free app key is available for Google Gemini only.",
          });
        }
      }

      const [[existingSettings], existingProviderKeys] = await Promise.all([
        ctx.db
          .select({
            provider: corsairAiSettings.provider,
            encryptedApiKey: corsairAiSettings.encryptedApiKey,
          })
          .from(corsairAiSettings)
          .where(eq(corsairAiSettings.userId, ctx.userId))
          .limit(1),
        ctx.db
          .select({ provider: corsairAiProviderKeys.provider })
          .from(corsairAiProviderKeys)
          .where(eq(corsairAiProviderKeys.userId, ctx.userId)),
      ]);

      const savedProviders = existingProviderKeys
        .map(({ provider }) => provider)
        .filter(isAiProvider);
      const hasLegacyKey =
        Boolean(existingSettings?.encryptedApiKey) &&
        existingSettings?.provider === input.provider;

      if (input.source === "byok") {
        if (input.apiKey) {
          const now = new Date();
          const encryptedApiKey = encryptApiKey(input.apiKey);
          await ctx.db
            .insert(corsairAiProviderKeys)
            .values({
              userId: ctx.userId,
              provider: input.provider,
              encryptedApiKey,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                corsairAiProviderKeys.userId,
                corsairAiProviderKeys.provider,
              ],
              set: {
                encryptedApiKey,
                updatedAt: now,
              },
            });

          if (!savedProviders.includes(input.provider)) {
            savedProviders.push(input.provider);
          }
        } else if (!savedProviders.includes(input.provider) && !hasLegacyKey) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Enter an API key for ${input.provider} before enabling BYOK.`,
          });
        }
      }

      const provider =
        input.source === "default" ? DEFAULT_AI_PROVIDER : input.provider;
      const model =
        input.source === "default" ? env.GEMINI_AGENT_MODEL : input.model;
      const now = new Date();

      await ctx.db
        .insert(corsairAiSettings)
        .values({
          userId: ctx.userId,
          provider,
          source: input.source,
          model,
          encryptedApiKey: null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: corsairAiSettings.userId,
          set: {
            provider,
            source: input.source,
            model,
            encryptedApiKey: null,
            updatedAt: now,
          },
        });

      return {
        provider,
        model,
        defaultModel: env.GEMINI_AGENT_MODEL,
        source: input.source,
        hasPrivateKey:
          input.source === "byok" &&
          (savedProviders.includes(provider) || hasLegacyKey),
        savedProviders,
        hasDefaultKey: Boolean(env.GEMINI_API_KEY),
      } as const;
    }),
});
