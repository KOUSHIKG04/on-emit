import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { isGeminiModel } from "@/lib/gemini";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsairAiSettings } from "@/server/db/schema";
import { encryptApiKey } from "@/server/ai/api-key-crypto";

const geminiModelSchema = z.enum(["gemini-3.5-flash", "gemini-3.5-flash-lite"]);

const updateSettingsInput = z.object({
  source: z.enum(["default", "byok"]),
  model: geminiModelSchema,
  apiKey: z.string().trim().min(20).max(500).optional(),
});

export const aiSettingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [settings] = await ctx.db
      .select()
      .from(corsairAiSettings)
      .where(eq(corsairAiSettings.userId, ctx.userId))
      .limit(1);

    const usingByok = Boolean(settings?.encryptedApiKey);

    return {
      provider: "gemini" as const,
      model:
        usingByok && isGeminiModel(settings?.model)
          ? settings.model
          : env.GEMINI_AGENT_MODEL,
      defaultModel: env.GEMINI_AGENT_MODEL,
      source: usingByok ? ("byok" as const) : ("default" as const),
      hasPrivateKey: usingByok,
      hasDefaultKey: Boolean(env.GEMINI_API_KEY),
    };
  }),

  update: protectedProcedure
    .input(updateSettingsInput)
    .mutation(async ({ ctx, input }) => {
      if (input.source === "default" && !env.GEMINI_API_KEY) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No app Gemini key is configured. Use your own key.",
        });
      }

      const [existing] = await ctx.db
        .select({ encryptedApiKey: corsairAiSettings.encryptedApiKey })
        .from(corsairAiSettings)
        .where(eq(corsairAiSettings.userId, ctx.userId))
        .limit(1);

      let encryptedApiKey: string | null = null;
      if (input.source === "byok") {
        if (input.apiKey) {
          encryptedApiKey = encryptApiKey(input.apiKey);
        } else if (existing?.encryptedApiKey) {
          encryptedApiKey = existing.encryptedApiKey;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Enter a Gemini API key before enabling BYOK.",
          });
        }
      }

      const model =
        input.source === "byok" ? input.model : env.GEMINI_AGENT_MODEL;
      const now = new Date();
      await ctx.db
        .insert(corsairAiSettings)
        .values({
          userId: ctx.userId,
          provider: "gemini",
          model,
          encryptedApiKey,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: corsairAiSettings.userId,
          set: {
            provider: "gemini",
            model,
            encryptedApiKey,
            updatedAt: now,
          },
        });

      return {
        provider: "gemini" as const,
        model,
        defaultModel: env.GEMINI_AGENT_MODEL,
        source: input.source,
        hasPrivateKey: Boolean(encryptedApiKey),
        hasDefaultKey: Boolean(env.GEMINI_API_KEY),
      };
    }),
});
