"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  MailOpen,
  Paperclip,
  UserRound,
  X,
} from "@/components/icons";

import { AgentChat } from "@/components/agent/agent-chat";
import { EmailHtmlFrame } from "@/components/mail/email-html-frame";
import { EmailMarkdown } from "@/components/mail/email-markdown";
import { ThreadActions } from "@/components/mail/thread-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api, type RouterOutputs } from "@/trpc/client";
import { ClientDateTime } from "@/components/shared/client-date-time";

type ThreadMessage = RouterOutputs["gmail"]["thread"]["messages"][number];

type DisplayAddress = {
  name: string | null;
  email: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAddresses(addresses: DisplayAddress[]) {
  return addresses
    .map((address) => {
      if (address.name) {
        return `${address.name} <${address.email}>`;
      }

      return address.email;
    })
    .join(", ");
}

export function ThreadReader({
  threadId,
  onClose,
}: {
  threadId?: string | null;
  onClose?: () => void;
} = {}) {
  const storedThreadId = useWorkspaceStore((state) => state.selectedThreadId);
  const requestNewAgentChat = useWorkspaceStore(
    (state) => state.requestNewAgentChat,
  );
  const selectedThreadId = threadId === undefined ? storedThreadId : threadId;
  const [agentOpen, setAgentOpen] = useState(false);

  const utils = api.useUtils();
  const threadAction = api.gmail.threadAction.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.gmail.inbox.invalidate(),
        utils.gmail.stats.invalidate(),
      ]);
    },
  });

  const {
    data: thread,
    error,
    isLoading,
  } = api.gmail.thread.useQuery(
    {
      threadId: selectedThreadId ?? "",
    },
    {
      enabled: Boolean(selectedThreadId),
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  );

  const markAsRead = threadAction.mutate;

  useEffect(() => {
    if (thread?.unread && selectedThreadId) {
      markAsRead({
        threadId: selectedThreadId,
        action: "mark_read",
      });
    }
  }, [thread?.unread, selectedThreadId, markAsRead]);

  if (!selectedThreadId) {
    return (
      <Card className="min-h-[550px]">
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center text-center">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <MailOpen className="text-muted-foreground size-6" />
          </div>

          <p className="mt-4 font-medium">Select a conversation</p>

          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            Choose an email from the inbox to read the complete conversation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[550px] min-w-0">
      <Sheet open={agentOpen} onOpenChange={setAgentOpen}>
        <SheetContent
          side="right"
          className="w-[min(42rem,96vw)] gap-0 p-0 sm:max-w-2xl"
          showCloseButton
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Email agent</SheetTitle>
            <SheetDescription>
              Chat with the agent about the selected Gmail conversation.
            </SheetDescription>
          </SheetHeader>
          <AgentChat variant="panel" />
        </SheetContent>
      </Sheet>

      {isLoading ? (
        <CardContent>
          <ThreadSkeleton />
        </CardContent>
      ) : null}

      {error ? (
        <CardContent className="flex min-h-[500px] flex-col items-center justify-center text-center">
          <AlertCircle className="text-destructive size-8" />

          <p className="mt-4 font-medium">Conversation could not be loaded</p>

          <p className="text-muted-foreground mt-1 text-sm">{error.message}</p>
        </CardContent>
      ) : null}

      {thread ? (
        <>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-xl">{thread.subject}</CardTitle>
                <CardDescription className="mt-1">
                  {thread.messageCount} message
                  {thread.messageCount === 1 ? "" : "s"} in this conversation
                </CardDescription>
              </div>

              <div className="flex shrink-0 items-start gap-1">
                <ThreadActions
                  threadId={thread.id}
                  messageId={thread.messages.at(-1)?.id ?? null}
                  unread={thread.unread}
                  starred={thread.starred}
                  onOpenAgent={() => {
                    const latestMessage = thread.messages.at(-1);
                    requestNewAgentChat({
                      type: "gmail-thread",
                      threadId: thread.id,
                      subject: thread.subject,
                      senderEmail: latestMessage?.from.email ?? null,
                    });
                    setAgentOpen(true);
                  }}
                  {...(onClose ? { onArchived: onClose } : {})}
                />
                {onClose ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="shrink-0"
                    aria-label="Close conversation"
                    onClick={onClose}
                  >
                    <X />
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>

          <CardContent className="max-w-full min-w-0 space-y-5 overflow-x-hidden">
            {thread.messages.map((message) => {
              const regularAttachments = message.attachments.filter(
                (attachment) => !attachment.inline,
              );

              return (
                <article
                  key={message.id}
                  className="border-border max-w-full min-w-0 overflow-hidden rounded-xl border p-4"
                >
                  <header className="flex items-start gap-3">
                    <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-full">
                      <UserRound className="text-muted-foreground size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {message.from.name ?? message.from.email}
                          </p>

                          <p className="text-muted-foreground truncate text-xs">
                            {message.from.email}
                          </p>
                        </div>

                        <ClientDateTime
                          className="text-muted-foreground shrink-0 text-xs"
                          value={message.sentAt}
                          format="sent"
                          fallback="Unknown time"
                        />
                      </div>

                      {message.to.length > 0 ? (
                        <p className="text-muted-foreground mt-2 text-xs break-words">
                          To: {formatAddresses(message.to)}
                        </p>
                      ) : null}

                      {message.cc.length > 0 ? (
                        <p className="text-muted-foreground mt-1 text-xs break-words">
                          Cc: {formatAddresses(message.cc)}
                        </p>
                      ) : null}
                    </div>
                  </header>

                  <MessageBody message={message} />

                  {regularAttachments.length > 0 ? (
                    <div className="border-border mt-5 border-t pt-4">
                      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <Paperclip className="size-4" />
                        Attachments
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {regularAttachments.map((attachment) => (
                          <a
                            key={attachment.index}
                            href={`/api/mail/attachments/${encodeURIComponent(
                              message.id,
                            )}/${attachment.index}`}
                            className="border-border hover:bg-muted max-w-full rounded-lg border px-3 py-2 text-xs transition-colors"
                          >
                            <span className="block max-w-56 truncate font-medium">
                              {attachment.filename}
                            </span>

                            <span className="text-muted-foreground">
                              {formatFileSize(attachment.size)}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </CardContent>
        </>
      ) : null}
    </Card>
  );
}

function MessageBody({ message }: { message: ThreadMessage }) {
  return (
    <div className="mt-5 max-w-full min-w-0">
      {message.htmlDocument ? (
        <EmailHtmlFrame
          htmlDocument={message.htmlDocument}
          title={message.subject}
        />
      ) : message.text ? (
        <EmailMarkdown body={message.text} />
      ) : (
        <p className="text-muted-foreground text-sm">
          This email did not contain a readable body.
        </p>
      )}
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-32" />
      </div>

      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="space-y-4 rounded-xl border p-4">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-full" />

            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>

          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
