import {
  Agent,
  MaxTurnsExceededError,
  ModelBehaviorError,
  OpenAIProvider,
  Runner,
  setTracingDisabled,
  ToolCallError,
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
import { corsair, getTenantCorsair } from "@/server/corsair";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsairAiProviderKeys, corsairAiSettings } from "@/server/db/schema";
import { createRawEmail } from "@/server/email/create-raw-email";

const imageAttachmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  dataUrl: z
    .string()
    .max(3_500_000)
    .regex(/^data:image\/(?:jpeg|png|webp|gif);base64,/),
});
const conversationHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const chatInput = z
  .object({
    message: z.string().trim().max(4_000),
    attachments: z.array(imageAttachmentSchema).max(3).default([]),
    history: z.array(conversationHistoryItemSchema).max(12).default([]),
    confirmed: z.boolean().default(false),
    timeZone: z.string().trim().min(1).max(100).default("UTC"),
  })
  .refine((input) => input.message.length > 0 || input.attachments.length > 0, {
    message: "Enter a request or attach an image.",
    path: ["message"],
  });

const agentEmailAddress = z.string().trim().email().max(320);
const agentEmailMessageSchema = z.object({
  to: z.array(agentEmailAddress).min(1).max(50),
  cc: z.array(agentEmailAddress).max(50).optional(),
  subject: z
    .string()
    .trim()
    .min(1)
    .max(998)
    .refine((value) => !/[\r\n]/.test(value), {
      message: "Subject cannot contain line breaks.",
    }),
  body: z.string().min(1).max(100_000),
});
const agentCalendarEventSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(20_000).optional(),
  location: z.string().trim().max(1_000).optional(),
  attendees: z.array(agentEmailAddress).max(100).optional(),
  startsAt: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: "Use an RFC 3339 date and time with a UTC offset.",
    })
    .refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value), {
      message: "Include Z or an explicit UTC offset in the start time.",
    }),
  endsAt: z
    .string()
    .refine((value) => Number.isFinite(Date.parse(value)), {
      message: "Use an RFC 3339 date and time with a UTC offset.",
    })
    .refine((value) => /(?:Z|[+-]\d{2}:\d{2})$/i.test(value), {
      message: "Include Z or an explicit UTC offset in the end time.",
    }),
});

process.env.OPENAI_AGENTS_DISABLE_TRACING = "1";
setTracingDisabled(true);

const originalFetch = globalThis.fetch;
const GEMINI_MIN_REQUEST_INTERVAL_MS = 12_500;
const GEMINI_SIGNATURE_TTL_MS = 5 * 60_000;
let nextGeminiRequestAt = 0;
const geminiThoughtSignatures = new Map<
  string,
  { signature: string; expiresAt: number }
>();

function rememberGeminiThoughtSignature(callId: string, signature: string) {
  const now = Date.now();

  for (const [storedCallId, entry] of geminiThoughtSignatures) {
    if (entry.expiresAt <= now) {
      geminiThoughtSignatures.delete(storedCallId);
    }
  }

  geminiThoughtSignatures.set(callId, {
    signature,
    expiresAt: now + GEMINI_SIGNATURE_TTL_MS,
  });
}

function getGeminiThoughtSignature(callId: string | undefined) {
  if (!callId) return undefined;

  const entry = geminiThoughtSignatures.get(callId);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    geminiThoughtSignatures.delete(callId);
    return undefined;
  }

  return entry.signature;
}

async function waitForGeminiRequestSlot() {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextGeminiRequestAt);
  nextGeminiRequestAt = scheduledAt + GEMINI_MIN_REQUEST_INTERVAL_MS;

  if (scheduledAt > now) {
    await new Promise((resolve) => setTimeout(resolve, scheduledAt - now));
  }
}

async function geminiNativeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const urlStr =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (
    !urlStr.includes("generativelanguage.googleapis.com") ||
    typeof init?.body !== "string"
  ) {
    return originalFetch(input, init);
  }

  let payload: {
    model?: string;
    messages?: Array<{
      role?: string;
      name?: string;
      tool_call_id?: string;
      content?: string | Array<Record<string, unknown>>;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
        extra_content?: {
          google?: {
            thought_signature?: string;
          };
        };
      }>;
    }>;
    tools?: Array<{
      function?: {
        name?: string;
        description?: string;
        parameters?: Record<string, unknown>;
      };
      name?: string;
      description?: string;
      parameters?: Record<string, unknown>;
    }>;
  };

  try {
    payload = JSON.parse(init.body) as typeof payload;
  } catch {
    return originalFetch(input, init);
  }

  const headersObj = new Headers(init.headers);
  const apiKey =
    headersObj.get("x-goog-api-key") ??
    headersObj.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: "Missing API key." } }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const modelName = payload.model ?? env.GEMINI_AGENT_MODEL;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  let systemText = "";
  const contents: Array<{
    role: string;
    parts: Array<Record<string, unknown>>;
  }> = [];

  for (const msg of payload.messages ?? []) {
    if (msg.role === "system" || msg.role === "developer") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : (JSON.stringify(msg.content) ?? "");
      systemText += (systemText ? "\n" : "") + text;
      continue;
    }

    if (msg.role === "user") {
      const parts: Array<Record<string, unknown>> = [];
      if (typeof msg.content === "string") {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (
            (item.type === "input_text" || item.type === "text") &&
            typeof item.text === "string"
          ) {
            parts.push({ text: item.text });
          } else if (item.type === "input_image" || item.type === "image_url") {
            const dataUrl =
              typeof item.image === "string"
                ? item.image
                : typeof (item.image_url as { url?: string })?.url === "string"
                  ? (item.image_url as { url: string }).url
                  : "";
            if (dataUrl.startsWith("data:")) {
              const [header, base64Data] = dataUrl.split(",");
              const mimeType = header?.match(/data:(.*?);/)?.[1] ?? "image/png";
              parts.push({
                inlineData: { mimeType, data: base64Data },
              });
            }
          }
        }
      }
      contents.push({ role: "user", parts });
    } else if (msg.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      if (typeof msg.content === "string") {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (
            (item.type === "output_text" || item.type === "text") &&
            typeof item.text === "string"
          ) {
            parts.push({ text: item.text });
          }
        }
      }
      if (Array.isArray(msg.tool_calls)) {
        for (const call of msg.tool_calls) {
          if (call.function?.name) {
            let args: Record<string, unknown> = {};
            try {
              args =
                typeof call.function.arguments === "string"
                  ? (JSON.parse(call.function.arguments) as Record<
                      string,
                      unknown
                    >)
                  : ((call.function.arguments as unknown as Record<
                      string,
                      unknown
                    >) ?? {});
            } catch {
              args = {};
            }

            const thoughtSignature =
              call.extra_content?.google?.thought_signature ??
              getGeminiThoughtSignature(call.id);

            parts.push({
              functionCall: {
                name: call.function.name,
                args,
                ...(call.id ? { id: call.id } : {}),
              },
              ...(thoughtSignature ? { thoughtSignature } : {}),
            });
          }
        }
      }
      contents.push({ role: "model", parts });
    } else if (msg.role === "tool") {
      let responseObj: Record<string, unknown> = {};
      try {
        responseObj =
          typeof msg.content === "string"
            ? (JSON.parse(msg.content) as Record<string, unknown>)
            : ((msg.content as unknown as Record<string, unknown>) ?? {});
      } catch {
        responseObj = { result: msg.content };
      }
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.name ?? "tool_result",
              response: responseObj,
              ...(msg.tool_call_id ? { id: msg.tool_call_id } : {}),
            },
          },
        ],
      });
    }
  }

  let tools:
    Array<{ functionDeclarations: Array<Record<string, unknown>> }> | undefined;
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    const functionDeclarations = payload.tools.map((t) => {
      const fn = t.function ?? t;
      const params = fn.parameters
        ? (JSON.parse(JSON.stringify(fn.parameters)) as unknown as Record<
            string,
            unknown
          >)
        : undefined;
      if (params) {
        delete params.$schema;
        delete params.additionalProperties;
      }
      return {
        name: fn.name,
        description: fn.description ?? "",
        parameters: params,
      };
    });
    tools = [{ functionDeclarations }];
  }

  const nativeBody = {
    contents,
    ...(systemText
      ? { systemInstruction: { parts: [{ text: systemText }] } }
      : {}),
    ...(tools ? { tools } : {}),
  };

  await waitForGeminiRequestSlot();

  const resp = await originalFetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(nativeBody),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return new Response(errText, {
      status: resp.status,
      headers: {
        "Content-Type":
          resp.headers.get("content-type") ?? "application/json; charset=UTF-8",
      },
    });
  }

  const data = (await resp.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
          thoughtSignature?: string;
          functionCall?: {
            id?: string;
            name: string;
            args?: Record<string, unknown>;
          };
        }>;
      };
    }>;
  };

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  let textOutput = "";
  const toolCalls: Array<Record<string, unknown>> = [];

  for (const part of parts) {
    if (part.text) {
      textOutput += part.text;
    }
    if (part.functionCall) {
      const callId =
        part.functionCall.id ??
        `call_${Math.random().toString(36).slice(2, 9)}`;

      if (part.thoughtSignature) {
        rememberGeminiThoughtSignature(callId, part.thoughtSignature);
      }

      toolCalls.push({
        id: callId,
        type: "function",
        ...(part.thoughtSignature
          ? {
              extra_content: {
                google: {
                  thought_signature: part.thoughtSignature,
                },
              },
            }
          : {}),
        function: {
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args ?? {}),
        },
      });
    }
  }

  const openAiResponse = {
    id: `chatcmpl-${Math.random().toString(36).slice(2, 10)}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelName,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textOutput.length > 0 ? textOutput : null,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: toolCalls.length > 0 ? "tool_calls" : "stop",
      },
    ],
  };

  return new Response(JSON.stringify(openAiResponse), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

if (
  !(globalThis as unknown as { __gemini_fetch_patched?: boolean })
    .__gemini_fetch_patched
) {
  (
    globalThis as unknown as { __gemini_fetch_patched?: boolean }
  ).__gemini_fetch_patched = true;

  globalThis.fetch = function (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input && typeof input === "object" && "url" in input
            ? input.url
            : "";

    if (urlStr.includes("generativelanguage.googleapis.com/v1beta/openai")) {
      return geminiNativeFetch(input, init);
    }

    return originalFetch(input, init);
  };
}

const AGENT_TIMEOUT_MS = 150_000;
const PROVIDER_BASE_URLS: Record<AiProvider, string> = {
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  openrouter: "https://openrouter.ai/api/v1",
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1/",
};
const QUEUE_ACTION_MARKER = "[QUEUE_ACTION]";
const WRITE_TOOL_NAME_PATTERN =
  /(send|draft|create|update|delete|modify|archive|trash|untrash|reply|forward|move|mark|schedule|cancel)/i;
const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;
type ReconnectPlugin = "gmail" | "googlecalendar";

function getReconnectPlugin(message: string): ReconnectPlugin | null {
  if (
    !/invalid_grant|access token (?:has )?expired|refresh token|re-?authenticate|reconnect/i.test(
      message,
    )
  ) {
    return null;
  }

  if (/calendar|event|invite|schedule/i.test(message)) {
    return "googlecalendar";
  }

  if (/gmail|email|mail|inbox|unread/i.test(message)) {
    return "gmail";
  }

  return null;
}

function reconnectReply(plugin: ReconnectPlugin) {
  const name = plugin === "gmail" ? "Gmail" : "Google Calendar";
  return `Your ${name} connection has expired. Reconnect ${name}, then send this request again.`;
}

function sanitizeAgentReply(reply: string) {
  const containsUsefulResult =
    /summary|retrieved|found|scheduled|drafted|sent|updated|unread mail|calendar/i.test(
      reply,
    );

  if (!containsUsefulResult) return reply;

  return reply
    .replace(
      /(?:\*{1,2})?\(?\s*(?:note:\s*)?(?:an?\s+)?(?:initial|transient)?\s*integration error[\s\S]*?(?:successfully retrieved afterward|succeeded afterward|retrieved afterward)\.?\s*\)?(?:\*{1,2})?/gi,
      "",
    )
    .replace(
      /^.*(?:TypeError|Cannot read properties of undefined|reading ['"]api['"]).*$/gim,
      "",
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getLatestExplicitUserYear(
  message: string,
  history: Array<z.infer<typeof conversationHistoryItemSchema>>,
) {
  const userText = [
    ...history
      .filter((item) => item.role === "user")
      .map((item) => item.content),
    message,
  ].join("\n");
  const years = [...userText.matchAll(/\b(20\d{2})\b/g)];
  const year = years.at(-1)?.[1];

  return year ? Number(year) : null;
}

function formatCalendarApprovalPreview(
  reply: string,
  timeZone: string,
  explicitYear: number | null,
) {
  if (!/create calendar event/i.test(reply)) return reply;

  const attendees = reply
    .match(/\*{0,2}Attendees?\*{0,2}\s*:\s*([^\n]+)/i)?.[1]
    ?.replace(/[*_`]/g, "")
    .trim();
  const startValue = reply
    .match(/\*{0,2}Start Time\*{0,2}\s*:\s*([^\s\n]+)/i)?.[1]
    ?.trim();

  if (!startValue) return reply;

  const correctedStartValue =
    explicitYear && /^\d{4}-/.test(startValue)
      ? startValue.replace(/^\d{4}/, String(explicitYear))
      : startValue;
  const startsAt = new Date(correctedStartValue);
  if (!Number.isFinite(startsAt.getTime())) return reply;

  try {
    const date = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(startsAt);
    const time = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(startsAt);

    return attendees
      ? `I will schedule a meeting with ${attendees} on ${date}, at ${time}.`
      : `I will schedule a meeting on ${date}, at ${time}.`;
  } catch {
    return reply;
  }
}

function getErrorText(error: unknown) {
  const messages: string[] = [];
  const visited = new Set<unknown>();

  function visit(value: unknown, depth: number) {
    if (value == null || depth > 4 || visited.has(value)) return;

    if (typeof value === "string") {
      messages.push(value);
      return;
    }

    if (typeof value !== "object") return;
    visited.add(value);

    if (value instanceof Error && value.message) {
      messages.push(value.message);
    }

    const nested = value as {
      message?: unknown;
      cause?: unknown;
      error?: unknown;
      originalError?: unknown;
    };

    if (!(value instanceof Error) && typeof nested.message === "string") {
      messages.push(nested.message);
    }

    visit(nested.cause, depth + 1);
    visit(nested.error, depth + 1);
    visit(nested.originalError, depth + 1);
  }

  visit(error, 0);
  return messages.join("\n") || "Unknown provider error";
}

function isRateLimitError(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : null;

  return (
    status === 429 ||
    /rate.?limit|quota|RESOURCE_EXHAUSTED|\b429\b/i.test(getErrorText(error))
  );
}

function getCollectedToolOutput(error: MaxTurnsExceededError) {
  const outputs =
    error.state?._generatedItems
      .filter((item) => item.type === "tool_call_output_item")
      .map((item) => {
        if (typeof item.output === "string") return item.output;

        try {
          return JSON.stringify(item.output);
        } catch {
          return String(item.output);
        }
      })
      .filter(Boolean) ?? [];

  if (outputs.length === 0) return null;

  let remaining = 24_000;
  const collected: string[] = [];

  for (const output of outputs) {
    if (remaining <= 0) break;
    const chunk = output.slice(0, Math.min(6_000, remaining));
    collected.push(chunk);
    remaining -= chunk.length;
  }

  return collected.join("\n\n--- next integration result ---\n\n");
}

const GMAIL_SEND_RESULT_PREFIX = "GMAIL_SEND_RESULT:";
const CALENDAR_CREATE_RESULT_PREFIX = "CALENDAR_CREATE_RESULT:";

function normalizeAgentEmailBody(body: string) {
  return body
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\r?\n/g, "\n")
    .trim();
}

function getConfirmedWriteResult(error: MaxTurnsExceededError) {
  const outputs =
    error.state?._generatedItems
    .filter((item) => item.type === "tool_call_output_item")
    .map((item) => {
      if (typeof item.output === "string") return item.output;

      try {
        return JSON.stringify(item.output) ?? "";
      } catch {
        return "";
      }
    }) ?? [];
  const output = outputs.find(
    (item) =>
      item.startsWith(GMAIL_SEND_RESULT_PREFIX) ||
      item.startsWith(CALENDAR_CREATE_RESULT_PREFIX),
  );

  if (!output) return null;

  try {
    const isCalendarResult = output.startsWith(
      CALENDAR_CREATE_RESULT_PREFIX,
    );
    const prefix = isCalendarResult
      ? CALENDAR_CREATE_RESULT_PREFIX
      : GMAIL_SEND_RESULT_PREFIX;
    const result = JSON.parse(
      output.slice(prefix.length),
    ) as {
      success: boolean;
      completed?: number;
      sent?: number;
      error?: string;
    };

    if (result.success) {
      const completed = result.completed ?? result.sent ?? 1;

      if (isCalendarResult) {
        return completed === 1
          ? "Meeting added to your Google Calendar successfully."
          : `${completed} meetings added to your Google Calendar successfully.`;
      }

      return completed === 1
        ? "Email sent successfully."
        : `${completed} emails sent successfully.`;
    }

    return (
      result.error ??
      (isCalendarResult
        ? "Google Calendar could not create the approved meeting."
        : "Gmail could not send the approved email.")
    );
  } catch {
    return null;
  }
}

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
    const publicProviderLabel = usingByok ? providerLabel : "Built-in AI";
    const configuredModel = usingByok
      ? (settings?.model ?? getDefaultAiModel(provider))
      : env.GEMINI_AGENT_MODEL;
    const model =
      provider === "gemini" &&
      /^(?:models\/)?gemini-2\.0-flash(?:-lite)?$/i.test(configuredModel)
        ? getDefaultAiModel("gemini")
        : configuredModel;
    let encryptedApiKey: string | null | undefined;

    if (usingByok) {
      try {
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
      } catch (error) {
        if (!isMissingAiSettingsSchema(error)) throw error;
        encryptedApiKey = settings?.encryptedApiKey;
      }
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

    console.log(
      `Agent running with ${providerLabel} (${model}) - Source: ${usingByok ? "BYOK (User Key)" : "App Default Key"}`,
    );

    if (!apiKey) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: usingByok
          ? `Add a ${providerLabel} API key in Settings to use agent chat.`
          : "Built-in AI is unavailable. Try again later or configure your own key in Settings.",
      });
    }

    const modelProvider = new OpenAIProvider({
      apiKey,
      baseURL: PROVIDER_BASE_URLS[provider],
      useResponses: false,
      ...(provider === "gemini"
        ? {
            fetch: geminiNativeFetch,
            defaultHeaders: { "x-goog-api-key": apiKey },
          }
        : {}),
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
      let gmailSendAttempt: Promise<string> | undefined;
      let calendarCreateAttempt: Promise<string> | undefined;
      let confirmedWriteFailed = false;
      let failedReconnectPlugin: ReconnectPlugin | null = null;
      const explicitUserYear = getLatestExplicitUserYear(
        input.message,
        input.history,
      );
      const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);
      const sendGmailTool = tool({
        name: "send_gmail_emails",
        description:
          "Send one or more approved Gmail messages through Corsair. Pass every email in one call. This tool constructs the Gmail MIME payload; never encode raw email data yourself and never retry this tool in the same request.",
        parameters: z.object({
          messages: z.array(agentEmailMessageSchema).min(1).max(20),
        }),
        execute: async ({ messages }) => {
          if (gmailSendAttempt) {
            return gmailSendAttempt;
          }

          gmailSendAttempt = (async () => {
            let sent = 0;

            try {
              for (const message of messages) {
                const raw = createRawEmail({
                  ...message,
                  body: normalizeAgentEmailBody(message.body),
                  cc: message.cc ?? [],
                });
                await tenantCorsair.gmail.api.messages.send({
                  userId: "me",
                  raw,
                });
                sent += 1;
              }

              return `${GMAIL_SEND_RESULT_PREFIX}${JSON.stringify({
                success: true,
                sent,
              })}`;
            } catch (error) {
              confirmedWriteFailed = true;
              console.error("Agent Gmail send failed:", error);
              const errorText = getErrorText(error);
              const reconnectPlugin = getReconnectPlugin(errorText);
              if (reconnectPlugin === "gmail") {
                failedReconnectPlugin = "gmail";
              }

              return `${GMAIL_SEND_RESULT_PREFIX}${JSON.stringify({
                success: false,
                sent,
                error:
                  reconnectPlugin === "gmail"
                    ? reconnectReply("gmail")
                    : sent > 0
                      ? `${sent} email${sent === 1 ? " was" : "s were"} sent before Gmail rejected the next message. The remaining messages were not retried.`
                      : "Gmail rejected the approved email. It was not retried.",
              })}`;
            }
          })();

          return gmailSendAttempt;
        },
      });
      const createCalendarEventsTool = tool({
        name: "create_calendar_events",
        description:
          "Create one or more approved meetings in the user's primary Google Calendar through Corsair. Pass every requested meeting in one call. Never retry this tool in the same request.",
        parameters: z.object({
          events: z.array(agentCalendarEventSchema).min(1).max(20),
        }),
        execute: async ({ events }) => {
          if (calendarCreateAttempt) {
            return calendarCreateAttempt;
          }

          calendarCreateAttempt = (async () => {
            let completed = 0;

            try {
              const connectionStatus =
                await corsair.manage.connectionStatus.get({
                  tenantId: ctx.corsairTenantId,
                });

              if (connectionStatus.googlecalendar !== "connected") {
                confirmedWriteFailed = true;
                failedReconnectPlugin = "googlecalendar";
                return `${CALENDAR_CREATE_RESULT_PREFIX}${JSON.stringify({
                  success: false,
                  completed,
                  error:
                    "Google Calendar is not connected. Connect or reconnect it, then approve the meeting again.",
                })}`;
              }

              const normalizedEvents = events.map((calendarEvent) => {
                const startsAtValue =
                  explicitUserYear && /^\d{4}-/.test(calendarEvent.startsAt)
                    ? calendarEvent.startsAt.replace(
                        /^\d{4}/,
                        String(explicitUserYear),
                      )
                    : calendarEvent.startsAt;
                const endsAtValue =
                  explicitUserYear && /^\d{4}-/.test(calendarEvent.endsAt)
                    ? calendarEvent.endsAt.replace(
                        /^\d{4}/,
                        String(explicitUserYear),
                      )
                    : calendarEvent.endsAt;
                const startsAt = new Date(startsAtValue).getTime();
                const endsAt = new Date(endsAtValue).getTime();

                if (
                  !Number.isFinite(startsAt) ||
                  !Number.isFinite(endsAt) ||
                  endsAt <= startsAt
                ) {
                  return null;
                }

                return {
                  ...calendarEvent,
                  startsAt: new Date(startsAt).toISOString(),
                  endsAt: new Date(endsAt).toISOString(),
                };
              });

              if (normalizedEvents.some((calendarEvent) => !calendarEvent)) {
                confirmedWriteFailed = true;
                return `${CALENDAR_CREATE_RESULT_PREFIX}${JSON.stringify({
                  success: false,
                  completed,
                  error:
                    "Every meeting end time must be after its start time. No meetings were created.",
                })}`;
              }

              for (const calendarEvent of normalizedEvents) {
                if (!calendarEvent) continue;

                const attendees = calendarEvent.attendees ?? [];
                const createdEvent =
                  await tenantCorsair.googlecalendar.api.events.create({
                    calendarId: "primary",
                    event: {
                      summary: calendarEvent.title,
                      ...(calendarEvent.description
                        ? { description: calendarEvent.description }
                        : {}),
                      ...(calendarEvent.location
                        ? { location: calendarEvent.location }
                        : {}),
                      start: {
                        dateTime: calendarEvent.startsAt,
                      },
                      end: {
                        dateTime: calendarEvent.endsAt,
                      },
                      ...(attendees.length > 0
                        ? {
                            attendees: attendees.map((email) => ({ email })),
                          }
                        : {}),
                      guestsCanInviteOthers: true,
                      guestsCanSeeOtherGuests: true,
                    },
                    sendUpdates: attendees.length > 0 ? "all" : "none",
                  });

                if (!createdEvent.id) {
                  throw new Error(
                    "Google Calendar did not confirm the created event.",
                  );
                }

                completed += 1;
              }

              return `${CALENDAR_CREATE_RESULT_PREFIX}${JSON.stringify({
                success: true,
                completed,
              })}`;
            } catch (error) {
              confirmedWriteFailed = true;
              console.error("Agent Google Calendar create failed:", error);
              const errorText = getErrorText(error);
              const calendarAuthExpired =
                /invalid_grant|access token (?:has )?expired|refresh token|expired or revoked/i.test(
                  errorText,
                );
              if (calendarAuthExpired) {
                failedReconnectPlugin = "googlecalendar";
              }

              return `${CALENDAR_CREATE_RESULT_PREFIX}${JSON.stringify({
                success: false,
                completed,
                error:
                  calendarAuthExpired
                    ? reconnectReply("googlecalendar")
                    : completed > 0
                      ? `${completed} meeting${completed === 1 ? " was" : "s were"} created before Google Calendar rejected the next one. The remaining meetings were not retried.`
                      : "Google Calendar rejected the approved meeting. It was not retried.",
              })}`;
            }
          })();

          return calendarCreateAttempt;
        },
      });
      const corsairTools = new OpenAIAgentsProvider().build({
        corsair: tenantCorsair,
        tenantId: ctx.corsairTenantId,
        setup: false,
        tool,
      });

      const runScriptTool = corsairTools.find(
        (item) => item.name === "run_script",
      );

      if (runScriptTool) {
        const invokeRunScript = runScriptTool.invoke.bind(runScriptTool);
        runScriptTool.invoke = async (runContext, serializedInput, details) => {
          let code = "";

          try {
            const parsed = JSON.parse(serializedInput) as { code?: unknown };
            code = typeof parsed.code === "string" ? parsed.code : "";
          } catch {
            // The original tool will return its normal validation error.
          }

          if (
            /\bgmail\b[\s\S]{0,240}\bmessages\b[\s\S]{0,100}\bsend\b/i.test(
              code,
            )
          ) {
            return input.confirmed
              ? "Do not send Gmail through run_script. Call send_gmail_emails exactly once with the approved message instead."
              : "Gmail sending requires user approval. Preview the message and queue it without running this script.";
          }

          if (
            /\bgooglecalendar\b[\s\S]{0,240}\bevents\b[\s\S]{0,100}\bcreate\b/i.test(
              code,
            )
          ) {
            return input.confirmed
              ? "Do not create calendar meetings through run_script. Call create_calendar_events exactly once with all approved meetings instead."
              : "Calendar creation requires user approval. Preview the meeting and queue it without running this script.";
          }

          if (
            !input.confirmed &&
            /\.(?:send|create|update|delete|modify|trash|untrash)\s*\(/i.test(
              code,
            )
          ) {
            return "This write operation requires user approval. Preview the exact action and queue it without running this script.";
          }

          return invokeRunScript(runContext, serializedInput, details);
        };
      }

      const safeTools = input.confirmed
        ? [sendGmailTool, createCalendarEventsTool, ...corsairTools]
        : corsairTools.filter(
            (item) => !WRITE_TOOL_NAME_PATTERN.test(item.name),
          );

      const agentInstructions = `You manage Gmail and Google Calendar through Corsair for one authenticated tenant.
Be concise and state exactly what you did. Never claim an action succeeded unless a tool result confirms it.
For approval previews, use one short natural-language sentence. Never show implementation fields such as Action, Start Time, End Time, RFC 3339 timestamps, JSON, or tool names.
Treat explicit dates, years, times, attendees, and titles written by the user as authoritative. Never replace an explicit year with the current year or with a different year from an earlier assistant message.
If a Google tool reports invalid_grant or an expired or revoked token, do not retry it. Clearly say which connection must be reconnected.
Never expose stack traces, JavaScript exception names, or internal implementation details. If an earlier tool attempt fails but a later attempt succeeds and the request is completed, do not mention the recovered internal error.
Never guess a Corsair JavaScript operation path. Before the first run_script call for a service, use list_operations for the exact gmail or googlecalendar plugin and use the returned path. If a guessed path fails, recover with the listed path without exposing the internal error.
For inbox summaries, search in a batch and summarize the newest 20 matching messages unless the user requests another limit. Avoid fetching messages one at a time when search results already contain enough subject, sender, date, and snippet information.
Do not call the same read tool repeatedly with equivalent arguments. After a successful search, list, or read result contains enough information to answer, stop using tools and answer the user.
For an approved Gmail send, always use send_gmail_emails exactly once. Put all requested messages into that single call. Write the body as natural, specific plain text with real paragraph breaks, not visible backslash-n sequences. Preserve concrete context supplied by the user, avoid generic promotional or urgent language, and never invent a relationship with the recipient. Never use run_script for Gmail messages.send, never construct MIME or base64 data yourself, and never retry a failed write.
For an approved new calendar meeting, always use create_calendar_events exactly once. Put all requested meetings into that single call. Never use run_script for googlecalendar events.create and never retry a failed write. Interpret relative dates and times in ${input.timeZone}, then supply RFC 3339 timestamps with an explicit UTC offset. Use relevant details from the conversation history. If the user supplies a date and start time but no end time or duration, default to 30 minutes and state that duration in the approval preview. Ask a concise clarification question only when the date or start time cannot be determined from the current request and history.
Current date and time: ${new Date().toISOString()}.
${
  input.confirmed
    ? "The user explicitly approved this queued action. Use the available write tools to complete it now."
    : `Read-only tools are available and read-only requests must be completed immediately. Write tools are unavailable. If the request needs an external write such as sending or drafting email, archiving mail, or changing the calendar, preview the exact action and begin the final response with exactly ${QUEUE_ACTION_MARKER}. Never use that marker for a read-only request.`
}`;

      const historyInput: AgentInputItem[] = input.history.map((item) =>
        item.role === "user"
          ? {
              role: "user",
              content: item.content,
            }
          : {
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: item.content }],
            },
      );
      const agentInput: AgentInputItem[] = [
        ...historyInput,
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
      const modelCandidates =
        provider === "gemini" && !input.confirmed
          ? [
              model,
              ...GEMINI_FALLBACK_MODELS.filter(
                (candidate) => candidate !== model,
              ),
            ]
          : [model];
      let rawReply: string | null = null;

      modelLoop: for (const [
        index,
        candidateModel,
      ] of modelCandidates.entries()) {
        const agent = new Agent({
          name: "On Emit assistant",
          model: candidateModel,
          tools: safeTools,
          instructions: agentInstructions,
        });

        try {
          const result = await runner.run(agent, agentInput, {
            maxTurns: 4,
            signal: timeoutController.signal,
          });
          rawReply = String(
            result.finalOutput ?? "No response was produced.",
          );
          break;
        } catch (error) {
          if (error instanceof MaxTurnsExceededError && input.confirmed) {
            const confirmedWriteResult = getConfirmedWriteResult(error);

            if (confirmedWriteResult) {
              rawReply = confirmedWriteResult;
              break;
            }
          }

          if (error instanceof MaxTurnsExceededError && !input.confirmed) {
            const collectedToolOutput = getCollectedToolOutput(error);

            if (collectedToolOutput) {
              let lastSynthesisError: unknown;

              for (const synthesisModel of modelCandidates.slice(index)) {
                const synthesisAgent = new Agent({
                  name: "On Emit response writer",
                  model: synthesisModel,
                  tools: [],
                  instructions:
                    "Answer the user's request using only the supplied integration results. Be concise and do not request or claim any new tool action. Never expose stack traces, JavaScript exception names, or internal implementation details. Report an integration problem only if it prevented completion; ignore an earlier failed attempt when a later result successfully provides the requested data.",
                });
                const synthesisInput: AgentInputItem[] = [
                  {
                    role: "user",
                    content: [
                      {
                        type: "input_text",
                        text: `Original request:\n${input.message || "Analyze the supplied integration data."}\n\nIntegration results:\n${collectedToolOutput}`,
                      },
                    ],
                  },
                ];

                try {
                  const synthesisResult = await runner.run(
                    synthesisAgent,
                    synthesisInput,
                    {
                      maxTurns: 1,
                      signal: timeoutController.signal,
                    },
                  );
                  rawReply = String(
                    synthesisResult.finalOutput ??
                      "No response was produced from the integration results.",
                  );
                  break modelLoop;
                } catch (synthesisError) {
                  lastSynthesisError = synthesisError;

                  if (
                    timeoutController.signal.aborted ||
                    !isRateLimitError(synthesisError)
                  ) {
                    throw synthesisError;
                  }
                }
              }

              throw (
                lastSynthesisError ??
                new Error("No Gemini model could summarize the tool results.")
              );
            }
          }

          const hasFallback = index < modelCandidates.length - 1;

          if (
            input.confirmed ||
            !hasFallback ||
            timeoutController.signal.aborted ||
            !isRateLimitError(error)
          ) {
            throw error;
          }

          console.warn(
            `Gemini model ${candidateModel} reached quota; retrying the read-only request with ${modelCandidates[index + 1]}.`,
          );
        }
      }

      if (rawReply === null) {
        throw new Error("No Gemini model completed the request.");
      }

      const requiresApproval =
        !input.confirmed &&
        rawReply.trimStart().startsWith(QUEUE_ACTION_MARKER);
      const agentReply = requiresApproval
        ? rawReply.trimStart().slice(QUEUE_ACTION_MARKER.length).trimStart()
        : rawReply;
      const formattedAgentReply = requiresApproval
        ? formatCalendarApprovalPreview(
            agentReply,
            input.timeZone,
            explicitUserYear,
          )
        : agentReply;
      const reconnectPlugin =
        failedReconnectPlugin ?? getReconnectPlugin(formattedAgentReply);
      const reply = reconnectPlugin
        ? reconnectReply(reconnectPlugin)
        : sanitizeAgentReply(formattedAgentReply);

      return {
        reply,
        requiresApproval,
        reconnectPlugin,
        actionSucceeded: input.confirmed ? !confirmedWriteFailed : null,
      };
    } catch (error) {
      if (timeoutController.signal.aborted) {
        throw new TRPCError({
          code: "TIMEOUT",
          message: `${publicProviderLabel} exceeded the 150-second time limit.`,
        });
      }

      if (error instanceof TRPCError) throw error;

      console.error(`Corsair ${providerLabel} agent failed:`, error);
      const errorMessage = getErrorText(error);
      const reconnectPlugin = getReconnectPlugin(errorMessage);

      if (reconnectPlugin) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: reconnectReply(reconnectPlugin),
        });
      }

      if (
        error instanceof MaxTurnsExceededError ||
        /max turns.*exceeded/i.test(errorMessage)
      ) {
        throw new TRPCError({
          code: "TIMEOUT",
          message:
            "The agent needed too many integration steps. Try the request again or narrow the email/date range.",
        });
      }

      if (error instanceof ToolCallError) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "The Google integration failed while completing this request. Try again or reconnect the affected service from its status menu.",
        });
      }

      if (error instanceof ModelBehaviorError) {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "The agent produced an invalid integration command. Rephrase the request and try again.",
        });
      }

      if (
        /api.?key|authentication|unauthorized|\b401\b|\b403\b/i.test(
          errorMessage,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: usingByok
            ? `${providerLabel} rejected the saved API key. Update it in Settings.`
            : "Built-in AI is temporarily unavailable. Try again later or configure your own key in Settings.",
        });
      }

      if (/rate.?limit|quota|RESOURCE_EXHAUSTED|\b429\b/i.test(errorMessage)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: usingByok
            ? `${providerLabel} reached this model's current quota. Switch to another BYOK model in the agent composer, wait for the quota window to reset, or update your key in Settings.`
            : "Built-in AI is busy right now. Try again in about a minute or use your own key in Settings.",
        });
      }

      throw new TRPCError({
        code: "BAD_GATEWAY",
        message:
          "The agent encountered an unexpected service error. Try the request again.",
      });
    } finally {
      clearTimeout(timeout);
      await modelProvider.close().catch(() => undefined);
    }
  }),
});
