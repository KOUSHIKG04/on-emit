"use client";

import { useState } from "react";
import { AlertCircle, Mail, MailOpen, Sparkles } from "lucide-react";

import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";
import { ClientDateTime } from "@/components/shared/client-date-time";

type InboxPanelProps = {
  variant?: "card" | "sidebar";
};

export function InboxPanel({ variant = "card" }: InboxPanelProps) {
  const [filter, setFilter] = useState<"all" | "high" | "low">("all");
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
  const visibleThreads =
    filter === "all"
      ? threads
      : threads?.filter((thread) => thread.priority === filter);
  const sidebar = variant === "sidebar";

  return (
    <Card
      className={cn(
        "min-h-[550px]",
        sidebar &&
          "bg-sidebar text-sidebar-foreground h-full min-h-0 gap-0 rounded-none py-0 shadow-none ring-0",
      )}
    >
      <CardHeader className={cn(sidebar && "border-b p-4")}>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-5" />
          Inbox
        </CardTitle>

        {!sidebar ? (
          <CardDescription>
            Your latest Gmail conversations through Corsair.
          </CardDescription>
        ) : null}

        <div
          className={cn(
            "flex flex-wrap gap-2 pt-2",
            sidebar && "grid grid-cols-3",
          )}
          aria-label="Inbox priority filter"
        >
          {(
            [
              ["all", "All"],
              ["high", "Priority"],
              ["low", "Low priority"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              size={sidebar ? "xs" : "sm"}
              variant={filter === value ? "default" : "outline"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "high" ? <Sparkles /> : null}
              {label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent
        className={cn(sidebar && "min-h-0 flex-1 overflow-y-auto px-0")}
      >
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

        {!isLoading &&
        !error &&
        threads &&
        threads.length > 0 &&
        visibleThreads?.length === 0 ? (
          <EmptyState
            title="No messages in this priority"
            description="Try another filter or return to All messages."
          />
        ) : null}

        {visibleThreads && visibleThreads.length > 0 ? (
          <div className="divide-border divide-y">
            {visibleThreads.map((thread) => {
              const selected = selectedThreadId === thread.id;

              return (
                <button
                  key={thread.id}
                  type="button"
                  className={cn(
                    "hover:bg-muted/60 flex w-full gap-3 rounded-lg px-3 py-4 text-left transition-colors",
                    sidebar && "rounded-none border-b px-4",
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

                      <ClientDateTime
                        className="text-muted-foreground shrink-0 text-xs"
                        value={thread.receivedAt}
                        format="inbox"
                      />
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

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                          thread.priority === "high" &&
                            "bg-primary/15 text-primary",
                          thread.priority === "normal" &&
                            "bg-muted text-muted-foreground",
                          thread.priority === "low" &&
                            "bg-slate-500/10 text-slate-600 dark:text-slate-400",
                        )}
                        title={`${thread.priorityReason} (${thread.prioritySource === "openai" ? "AI" : "local rules"})`}
                      >
                        {thread.priority === "high"
                          ? "Priority"
                          : thread.priority === "low"
                            ? "Low priority"
                            : "Normal"}
                      </span>
                      <span className="text-muted-foreground truncate text-[11px]">
                        {thread.priorityReason}
                      </span>
                    </div>
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
