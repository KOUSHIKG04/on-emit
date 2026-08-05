import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getCorsairConnectionStatus, getTenantCorsair } from "@/server/corsair";
import { createRawEmail } from "@/server/email/create-raw-email";
import { getEmailPriorities } from "@/server/email/classify-priority";
import {
  createSafeParsedMessage,
  parseGmailRaw,
} from "@/server/email/parse-email";

type GmailHeader = {
  name?: string;
  value?: string;
};

function getHeader(
  headers: GmailHeader[] | undefined,
  headerName: string,
): string | null {
  const header = headers?.find(
    (item) => item.name?.toLowerCase() === headerName.toLowerCase(),
  );

  return header?.value ?? null;
}

function parseSender(fromHeader: string | null) {
  if (!fromHeader) {
    return {
      name: null,
      email: "Unknown sender",
    };
  }

  // Example: "Koushik Datta <koushik@example.com>"
  const match = /^(.*)<([^>]+)>$/.exec(fromHeader);

  if (!match) {
    return {
      name: null,
      email: fromHeader.trim(),
    };
  }

  const rawName = match[1]?.trim() ?? "";
  const email = match[2]?.trim() ?? "Unknown sender";

  const name = rawName.replace(/^"|"$/g, "").trim();

  return {
    name: name || null,
    email,
  };
}

function decodeGmailSnippet(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (entity, decimal: string, hexadecimal: string, named: string) => {
      const codePoint = decimal
        ? Number(decimal)
        : hexadecimal
          ? Number.parseInt(hexadecimal, 16)
          : null;
      if (codePoint !== null) {
        return Number.isInteger(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return namedEntities[named.toLowerCase()] ?? entity;
    },
  );
}

function toISOString(
  value: string | number | Date | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" && /^\d+$/.test(value)) {
    /*
     * Gmail internalDate is commonly a millisecond timestamp
     * represented as a string.
     */
    date = new Date(Number(value));
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

const emailAddress = z.string().trim().email().max(320);

const sendEmailInput = z.object({
  to: z.array(emailAddress).min(1).max(50),
  cc: z.array(emailAddress).max(50).default([]),
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

const replyInput = z.object({
  threadId: z.string().min(1).max(1_000),
  messageId: z.string().min(1).max(1_000),
  body: z.string().trim().min(1).max(100_000),
});

const threadActionInput = z.object({
  threadId: z.string().min(1).max(1_000),
  action: z.enum([
    "archive",
    "unarchive",
    "mark_read",
    "mark_unread",
    "star",
    "unstar",
    "trash",
  ]),
});

const searchInput = z.object({
  query: z.string().trim().min(1).max(2_048),
  maxResults: z.number().int().min(1).max(50).default(25),
});

const mailboxListInput = z.object({
  maxResults: z.number().int().min(1).max(500).default(50),
  query: z.string().optional(),
});

async function ensureGmailConnected(tenantId: string) {
  const connectionStatus = await getCorsairConnectionStatus(tenantId);

  if (connectionStatus.gmail !== "connected") {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect Gmail before performing this action.",
    });
  }
}

async function listThreadSummaries(
  tenantCorsair: ReturnType<typeof getTenantCorsair>,
  query: string,
  maxResults: number,
) {
  const threadList = await tenantCorsair.gmail.api.threads.list({
    userId: "me",
    q: query,
    maxResults,
    includeSpamTrash: false,
  });

  const threadIds = (threadList.threads ?? [])
    .map((thread) => thread.id)
    .filter((id): id is string => Boolean(id));

  // Gmail's list endpoint only returns IDs and snippets. Load each matching
  // thread so the UI can show reliable sender, subject, date and unread state.
  const detailedThreads = await Promise.all(
    threadIds.map((threadId) =>
      tenantCorsair.gmail.api.threads.get({
        userId: "me",
        id: threadId,
        format: "metadata",
      }),
    ),
  );

  const threads = detailedThreads.map((thread) => {
    const messages = thread.messages ?? [];
    const latestMessage = messages[messages.length - 1];
    const headers = latestMessage?.payload?.headers;
    const sender = parseSender(getHeader(headers, "From"));

    return {
      id: thread.id ?? "",
      latestMessageId: latestMessage?.id ?? null,
      subject: getHeader(headers, "Subject") ?? "(No subject)",
      senderName: sender.name,
      senderEmail: sender.email,
      snippet: decodeGmailSnippet(
        latestMessage?.snippet ??
          thread.snippet ??
          "No message preview available.",
      ),
      receivedAt: toISOString(latestMessage?.internalDate),
      unread: (thread.messages ?? []).some((message) =>
        message.labelIds?.includes("UNREAD"),
      ),
      starred: (thread.messages ?? []).some((message) =>
        message.labelIds?.includes("STARRED"),
      ),
      messageCount: messages.length,
    };
  });

  threads.sort((first, second) => {
    const firstTime = first.receivedAt
      ? new Date(first.receivedAt).getTime()
      : 0;
    const secondTime = second.receivedAt
      ? new Date(second.receivedAt).getTime()
      : 0;

    return secondTime - firstTime;
  });

  return threads;
}

async function createReplyPayload(
  tenantId: string,
  input: z.infer<typeof replyInput>,
) {
  const tenantCorsair = getTenantCorsair(tenantId);
  const originalMessage = await tenantCorsair.gmail.api.messages.get({
    userId: "me",
    id: input.messageId,
    format: "raw",
  });

  if (!originalMessage.raw) {
    throw new Error("Gmail did not return the original message body.");
  }

  const parsed = await parseGmailRaw(originalMessage.raw);
  const safeMessage = createSafeParsedMessage(input.messageId, parsed);
  const replyAddresses =
    safeMessage.replyTo.length > 0
      ? safeMessage.replyTo
      : safeMessage.from.email !== "Unknown sender"
        ? [safeMessage.from]
        : [];

  if (replyAddresses.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This message does not contain a reply address.",
    });
  }

  const subject = /^re:/i.test(safeMessage.subject)
    ? safeMessage.subject
    : `Re: ${safeMessage.subject}`;
  const references = [parsed.references, parsed.messageId]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return {
    tenantCorsair,
    raw: createRawEmail({
      to: replyAddresses.map((address) => address.email),
      subject,
      body: input.body,
      ...(parsed.messageId ? { inReplyTo: parsed.messageId } : {}),
      ...(references ? { references } : {}),
    }),
  };
}

export const gmailRouter = createTRPCRouter({
  stats: protectedProcedure.query(async ({ ctx }) => {
    try {
      await ensureGmailConnected(ctx.corsairTenantId);
      const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);
      const inbox = await tenantCorsair.gmail.api.labels.get({
        userId: "me",
        id: "INBOX",
      });
      const total = inbox.messagesTotal ?? 0;
      const unread = inbox.messagesUnread ?? 0;

      return {
        total,
        unread,
        read: Math.max(0, total - unread),
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Failed to load Gmail dashboard statistics:", error);
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Gmail statistics could not be loaded.",
      });
    }
  }),

  activity: protectedProcedure.query(async ({ ctx }) => {
    try {
      await ensureGmailConnected(ctx.corsairTenantId);
      const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);

      // Fetch actual inbox threads to calculate daily activity
      const inboxThreads = await listThreadSummaries(
        tenantCorsair,
        "in:inbox",
        100,
      );

      const now = new Date();
      // Build 7 calendar day buckets ending today
      const days = Array.from({ length: 7 }, (_, index) => {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (6 - index));

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const dateStr = `${year}-${month}-${day}`;

        return {
          dateStr,
          timestampStart: d.getTime(),
          timestampEnd: d.getTime() + 86_400_000,
          messages: 0,
          unread: 0,
        };
      });

      for (const thread of inboxThreads) {
        const time = thread.receivedAt
          ? new Date(thread.receivedAt).getTime()
          : 0;
        if (!time) continue;

        const matchingDay = days.find(
          (d) => time >= d.timestampStart && time < d.timestampEnd,
        );

        if (matchingDay) {
          matchingDay.messages += thread.messageCount || 1;
          if (thread.unread) {
            matchingDay.unread += 1;
          }
        }
      }

      return days.map((d) => ({
        date: d.dateStr,
        messages: d.messages,
        unread: d.unread,
      }));
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      console.error("Failed to load Gmail activity:", error);
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Gmail activity could not be loaded.",
      });
    }
  }),

  search: protectedProcedure
    .input(searchInput)
    .query(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);

        return await listThreadSummaries(
          tenantCorsair,
          input.query,
          input.maxResults,
        );
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to search Gmail:", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail search could not be completed. Please try again.",
        });
      }
    }),

  reply: protectedProcedure
    .input(replyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const { tenantCorsair, raw } = await createReplyPayload(
          ctx.corsairTenantId,
          input,
        );
        const message = await tenantCorsair.gmail.api.messages.send({
          userId: "me",
          raw,
          threadId: input.threadId,
        });

        return {
          id: message.id ?? null,
          threadId: message.threadId ?? input.threadId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to reply to Gmail thread:", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail could not send this reply. Please try again.",
        });
      }
    }),

  saveReplyDraft: protectedProcedure
    .input(replyInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const { tenantCorsair, raw } = await createReplyPayload(
          ctx.corsairTenantId,
          input,
        );
        const draft = await tenantCorsair.gmail.api.drafts.create({
          userId: "me",
          draft: {
            message: {
              raw,
              threadId: input.threadId,
            },
          },
        });

        return {
          id: draft.id ?? null,
          threadId: draft.message?.threadId ?? input.threadId,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to save Gmail reply draft:", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail could not save this draft. Please try again.",
        });
      }
    }),

  threadAction: protectedProcedure
    .input(threadActionInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);

        const thread =
          input.action === "trash"
            ? await tenantCorsair.gmail.api.threads.trash({
                userId: "me",
                id: input.threadId,
              })
            : await tenantCorsair.gmail.api.threads.modify({
                userId: "me",
                id: input.threadId,
                ...(input.action === "archive"
                  ? { removeLabelIds: ["INBOX"] }
                  : input.action === "unarchive"
                    ? { addLabelIds: ["INBOX"] }
                    : input.action === "mark_read"
                      ? { removeLabelIds: ["UNREAD"] }
                      : input.action === "mark_unread"
                        ? { addLabelIds: ["UNREAD"] }
                        : input.action === "star"
                          ? { addLabelIds: ["STARRED"] }
                          : { removeLabelIds: ["STARRED"] }),
              });

        return {
          threadId: thread.id ?? input.threadId,
          action: input.action,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error(`Failed to run Gmail action ${input.action}:`, error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail could not update this conversation.",
        });
      }
    }),

  send: protectedProcedure
    .input(sendEmailInput)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);

        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);
        const raw = createRawEmail(input);
        const message = await tenantCorsair.gmail.api.messages.send({
          userId: "me",
          raw,
        });

        return {
          id: message.id ?? null,
          threadId: message.threadId ?? null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to send Gmail message:", error);

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail could not send this message. Please try again.",
        });
      }
    }),

  inbox: protectedProcedure
    .input(mailboxListInput)
    .query(async ({ ctx, input }) => {
      try {
        /*
         * Check whether the Supabase user's Gmail account
         * is connected to their Corsair tenant.
         */
        const connectionStatus = await getCorsairConnectionStatus(
          ctx.corsairTenantId,
        );

        if (connectionStatus.gmail !== "connected") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Connect Gmail before loading your inbox.",
          });
        }

        /*
         * The Supabase user ID becomes the Corsair tenant ID.
         *
         * The browser does not provide the tenant ID.
         */
        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);

        /*
         * threads.list only returns lightweight thread information.
         * We request a small number to avoid unnecessary API calls.
         */
        const queryFilter = input.query?.trim()
          ? input.query.trim()
          : "in:inbox";
        const inboxThreads = await listThreadSummaries(
          tenantCorsair,
          queryFilter,
          input.maxResults,
        );
        const priorities = await getEmailPriorities(
          ctx.corsairTenantId,
          inboxThreads,
        );

        return inboxThreads.map((thread) => ({
          ...thread,
          priority: priorities.get(thread.id)?.priority ?? "normal",
          priorityReason:
            priorities.get(thread.id)?.reason ??
            "Priority has not been classified.",
          prioritySource: priorities.get(thread.id)?.source ?? "rules",
        }));
      } catch (error) {
        /*
         * Preserve intentional tRPC errors such as Gmail not connected.
         */
        if (error instanceof TRPCError) {
          throw error;
        }

        /*
         * Log the original error on the server.
         * Do not return token or Corsair internals to the browser.
         */
        console.error("Failed to load Gmail inbox:", error);

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail could not be loaded. Please try again.",
        });
      }
    }),

  drafts: protectedProcedure
    .input(mailboxListInput)
    .query(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);
        const drafts = await listThreadSummaries(
          tenantCorsair,
          "in:drafts",
          input.maxResults,
        );

        return drafts.map((thread) => ({
          ...thread,
          priority: "normal" as const,
          priorityReason: "Draft message",
          prioritySource: "rules" as const,
        }));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to load Gmail drafts:", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Gmail drafts could not be loaded.",
        });
      }
    }),

  archived: protectedProcedure
    .input(mailboxListInput)
    .query(async ({ ctx, input }) => {
      try {
        await ensureGmailConnected(ctx.corsairTenantId);
        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);
        const archived = await listThreadSummaries(
          tenantCorsair,
          "-in:inbox -in:sent -in:drafts -in:spam -in:trash",
          input.maxResults,
        );

        return archived.map((thread) => ({
          ...thread,
          priority: "normal" as const,
          priorityReason: "Archived conversation",
          prioritySource: "rules" as const,
        }));
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to load archived Gmail conversations:", error);
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "Archived Gmail conversations could not be loaded.",
        });
      }
    }),

  thread: protectedProcedure
    .input(
      z.object({
        threadId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const connectionStatus = await getCorsairConnectionStatus(
          ctx.corsairTenantId,
        );

        if (connectionStatus.gmail !== "connected") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Connect Gmail before opening this conversation.",
          });
        }

        const tenantCorsair = getTenantCorsair(ctx.corsairTenantId);

        /*
         * Minimal gives us the Gmail message IDs without
         * downloading every body twice.
         */
        const thread = await tenantCorsair.gmail.api.threads.get({
          userId: "me",
          id: input.threadId,
          format: "minimal",
        });

        const messageIds = (thread.messages ?? []).flatMap((message) =>
          message.id ? [message.id] : [],
        );

        const loadedMessages = await Promise.all(
          messageIds.map(async (messageId) => {
            try {
              /*
               * Raw returns the original complete RFC/MIME email.
               */
              const rawMessage = await tenantCorsair.gmail.api.messages.get({
                userId: "me",
                id: messageId,
                format: "raw",
              });

              if (!rawMessage.raw) {
                throw new Error(
                  `Gmail did not return raw content for message ${messageId}.`,
                );
              }

              const parsed = await parseGmailRaw(rawMessage.raw);
              return createSafeParsedMessage(messageId, parsed);
            } catch (error) {
              console.error(`Failed to load message ${messageId}:`, error);
              return null;
            }
          }),
        );
        const messages = loadedMessages.filter(
          (message): message is NonNullable<typeof message> => message !== null,
        );

        const firstMessage = messages[0];
        const unread = (thread.messages ?? []).some((message) =>
          message.labelIds?.includes("UNREAD"),
        );
        const starred = (thread.messages ?? []).some((message) =>
          message.labelIds?.includes("STARRED"),
        );

        return {
          id: thread.id ?? input.threadId,
          subject: firstMessage?.subject ?? "(No subject)",
          snippet: thread.snippet ?? null,
          messageCount: messages.length,
          unread,
          starred,
          messages,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to load Gmail thread:", error);

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "The email conversation could not be loaded.",
        });
      }
    }),
});
