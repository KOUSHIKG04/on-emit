"use client";

import { AlertCircle, Mail, MailOpen } from "lucide-react";

import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

function formatReceivedAt(receivedAt: string | null) {
  if (!receivedAt) return "";

  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function InboxPanel() {
  const selectedThreadId = useWorkspaceStore((state) => state.selectedThreadId);
  const selectThread = useWorkspaceStore((state) => state.selectThread);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);

  const {
    data: threads,
    error,
    isLoading,
  } = api.gmail.inbox.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const gmailDisconnected = error?.data?.code === "PRECONDITION_FAILED";

  return (
    <Card className="min-h-[550px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" />
          Inbox
        </CardTitle>

        <CardDescription>
          Your latest Gmail conversations through Corsair.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? <InboxSkeleton /> : null}

        {gmailDisconnected ? (
          <EmptyState
            title="Gmail is not connected"
            description="Connect Gmail to your Supabase user's Corsair tenant."
          />
        ) : null}

        {error && !gmailDisconnected ? (
          <EmptyState
            title="Inbox could not be loaded"
            description={error.message}
          />
        ) : null}

        {!isLoading && !error && threads?.length === 0 ? (
          <EmptyState
            title="Your inbox is empty"
            description="No inbox threads were returned by Gmail."
          />
        ) : null}

        {threads && threads.length > 0 ? (
          <div className="divide-border divide-y">
            {threads.map((thread) => {
              const selected = selectedThreadId === thread.id;

              return (
                <button
                  key={thread.id}
                  type="button"
                  className={cn(
                    "hover:bg-muted/60 flex w-full gap-3 rounded-lg px-3 py-4 text-left transition-colors",
                    selected && "bg-muted",
                  )}
                  onClick={() => {
                    selectThread(thread.id);
                    setActiveView("inbox");
                  }}
                >
                  <div className="pt-1">
                    {thread.unread ? (
                      <Mail className="text-primary size-4" />
                    ) : (
                      <MailOpen className="text-muted-foreground size-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "truncate text-sm",
                          thread.unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {thread.senderName ?? thread.senderEmail}
                      </p>

                      <time className="text-muted-foreground shrink-0 text-xs">
                        {formatReceivedAt(thread.receivedAt)}
                      </time>
                    </div>

                    <p
                      className={cn(
                        "mt-1 truncate text-sm",
                        thread.unread && "font-semibold",
                      )}
                    >
                      {thread.subject}
                    </p>

                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {thread.snippet}
                    </p>

                    {thread.messageCount > 1 ? (
                      <p className="text-muted-foreground mt-2 text-xs">
                        {thread.messageCount} messages
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex gap-3 py-3">
          <Skeleton className="size-4 rounded-full" />

          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <AlertCircle className="text-muted-foreground size-5" />
      </div>

      <p className="mt-4 font-medium">{title}</p>

      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
    </div>
  );
}
