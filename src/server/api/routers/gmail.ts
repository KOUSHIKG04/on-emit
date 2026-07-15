import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair, getTenantCorsair } from "@/server/corsair";

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
  const match = fromHeader.match(/^(.*)<([^>]+)>$/);

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

function toISOString(
  value: string | number | Date | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export const gmailRouter = createTRPCRouter({
  inbox: protectedProcedure.query(async ({ ctx }) => {
    try {
      /*
       * Check whether the Supabase user's Gmail account
       * is connected to their Corsair tenant.
       */
      const connectionStatus = await corsair.manage.connectionStatus.get({
        tenantId: ctx.userId,
      });

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
      const tenantCorsair = getTenantCorsair(ctx.userId);

      /*
       * threads.list only returns lightweight thread information.
       * We request a small number to avoid unnecessary API calls.
       */
      const threadList = await tenantCorsair.gmail.api.threads.list({
        userId: "me",
        q: "in:inbox",
        labelIds: ["INBOX"],
        maxResults: 12,
        includeSpamTrash: false,
      });

      const threadIds = (threadList.threads ?? [])
        .map((thread) => thread.id)
        .filter((id): id is string => Boolean(id));

      /*
       * Fetch each thread so that we can read metadata such as:
       * Subject, From and Date.
       */
      const detailedThreads = await Promise.all(
        threadIds.map((threadId) =>
          tenantCorsair.gmail.api.threads.get({
            userId: "me",
            id: threadId,
            format: "full",
            // metadataHeaders: ["From", "Subject", "Date"],
          }),
        ),
      );

      const inboxThreads = detailedThreads.map((thread) => {
        const messages = thread.messages ?? [];

        // Gmail normally returns messages from oldest to newest.
        const latestMessage = messages[messages.length - 1];

        const headers = latestMessage?.payload?.headers;

        const subject = getHeader(headers, "Subject") ?? "(No subject)";
        const fromHeader = getHeader(headers, "From");
        const sender = parseSender(fromHeader);

        return {
          id: thread.id ?? "",
          subject,
          senderName: sender.name,
          senderEmail: sender.email,
          snippet:
            latestMessage?.snippet ??
            thread.snippet ??
            "No message preview available.",
          receivedAt: toISOString(latestMessage?.internalDate),
          unread: latestMessage?.labelIds?.includes("UNREAD") ?? false,
          messageCount: messages.length,
        };
      });

      /*
       * Show newest threads first.
       */
      inboxThreads.sort((first, second) => {
        const firstTime = first.receivedAt
          ? new Date(first.receivedAt).getTime()
          : 0;

        const secondTime = second.receivedAt
          ? new Date(second.receivedAt).getTime()
          : 0;

        return secondTime - firstTime;
      });

      return inboxThreads;
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
});
