"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  CheckSquare2,
  ChevronDown,
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Sparkles,
  SquarePen,
  Tag,
} from "@/components/icons";

import { ClientDateTime } from "@/components/shared/client-date-time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";

type InboxPanelProps = {
  variant?: "card" | "sidebar";
};

type MailboxMode = "inbox" | "priority" | "drafts";

const mailboxTabs = [
  { value: "inbox" as const, label: "Inbox", icon: Mail },
  { value: "priority" as const, label: "Priority", icon: Sparkles },
  { value: "drafts" as const, label: "Drafts", icon: SquarePen },
];

export function InboxPanel({ variant = "card" }: InboxPanelProps) {
  const [mode, setMode] = useState<MailboxMode>("inbox");
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(12);
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebar = variant === "sidebar";

  const selectedThreadId = useWorkspaceStore((state) => state.selectedThreadId);
  const selectThread = useWorkspaceStore((state) => state.selectThread);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const setCommandPaletteOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );
  const labelFilter = useWorkspaceStore((state) => state.inboxLabelFilter);
  const setLabelFilter = useWorkspaceStore(
    (state) => state.setInboxLabelFilter,
  );

  const inbox = api.gmail.inbox.useQuery(
    { maxResults },
    {
      enabled: mode !== "drafts",
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );
  const drafts = api.gmail.drafts.useQuery(
    { maxResults },
    {
      enabled: mode === "drafts",
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );
  const utils = api.useUtils();
  const threadAction = api.gmail.threadAction.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.gmail.inbox.invalidate(),
        utils.gmail.stats.invalidate(),
      ]);
    },
  });

  const activeQuery = mode === "drafts" ? drafts : inbox;
  const threads = activeQuery.data;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleThreads = threads?.filter((thread) => {
    if (mode === "priority" && thread.priority !== "high") return false;
    if (labelFilter === "unread" && !thread.unread) return false;
    if (labelFilter === "read" && thread.unread) return false;

    if (!normalizedQuery) return true;

    return [
      thread.senderName,
      thread.senderEmail,
      thread.subject,
      thread.snippet,
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
  });
  const gmailDisconnected =
    activeQuery.error?.data?.code === "PRECONDITION_FAILED";
  const canLoadMore = Boolean(threads && threads.length === maxResults);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function changeMode(nextMode: MailboxMode) {
    setMode(nextMode);
    setMaxResults(12);
    setLabelFilter("all");
  }

  return (
    <Card
      className={cn(
        "w-full min-w-0 min-h-[550px]",
        sidebar &&
          "bg-sidebar text-sidebar-foreground h-full min-h-0 gap-0 rounded-none py-0 shadow-none ring-0",
      )}
    >
      <CardHeader className={cn("gap-0", sidebar ? "p-0" : "border-b p-0")}>
        <div className="flex h-16 min-w-0 shrink-0 items-center gap-1 border-b px-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {mailboxTabs.map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "text-muted-foreground hover:text-foreground flex h-9 min-w-0 shrink items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                    active &&
                      "bg-background text-foreground shadow-sm ring-1 ring-border",
                  )}
                  onClick={() => changeMode(tab.value)}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {tab.value === "priority" && inbox.data ? (
                    <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[10px]">
                      {
                        inbox.data.filter(
                          (thread) => thread.priority === "high",
                        ).length
                      }
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Refresh mailbox"
            disabled={activeQuery.isFetching}
            onClick={() => void activeQuery.refetch()}
          >
            <RefreshCw
              className={activeQuery.isFetching ? "animate-spin" : undefined}
            />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="Compose email"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <SquarePen />
          </Button>
        </div>

        <div className="space-y-2.5 p-3">
          <label className="focus-within:border-ring focus-within:ring-ring/30 flex h-10 items-center gap-2 rounded-lg border px-3 transition-shadow focus-within:ring-2">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search sender, subject, or message"
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd className="text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]">
              /
            </kbd>
          </label>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full justify-start px-3 font-normal"
                  aria-label="Filter messages"
                />
              }
            >
              <Tag className="text-muted-foreground size-3.5" />
              <span className="min-w-0 flex-1 truncate text-left">
                {labelFilter === "all"
                  ? "All labels"
                  : labelFilter === "unread"
                    ? "Unread"
                    : "Read"}
              </span>
              <ChevronDown className="text-muted-foreground size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={labelFilter}
                onValueChange={(value) =>
                  setLabelFilter(value as "all" | "unread" | "read")
                }
              >
                <DropdownMenuRadioItem value="all">
                  All labels
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="unread">
                  Unread
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="read">
                  Read
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          "p-2",
          sidebar && "min-h-0 flex-1 overflow-y-auto px-2",
        )}
      >
        {activeQuery.isLoading ? <InboxSkeleton /> : null}

        {gmailDisconnected ? (
          <EmptyState
            title="Gmail is not connected"
            description="Open Settings to connect Gmail through Corsair."
          />
        ) : null}

        {activeQuery.error && !gmailDisconnected ? (
          <EmptyState
            title={`${mode === "drafts" ? "Drafts" : "Inbox"} could not be loaded`}
            description={activeQuery.error.message}
          />
        ) : null}

        {!activeQuery.isLoading && !activeQuery.error && threads?.length === 0 ? (
          <EmptyState
            title={mode === "drafts" ? "No saved drafts" : "Your inbox is empty"}
            description={
              mode === "drafts"
                ? "Draft messages saved in Gmail will appear here."
                : "No inbox messages were returned by Gmail."
            }
          />
        ) : null}

        {!activeQuery.isLoading &&
        !activeQuery.error &&
        threads &&
        threads.length > 0 &&
        visibleThreads?.length === 0 ? (
          <EmptyState
            title="No matching messages"
            description="Change the tab, filter, or search query."
          />
        ) : null}

        {visibleThreads && visibleThreads.length > 0 ? (
          <div className="space-y-1">
            {visibleThreads.map((thread) => {
              const selected = selectedThreadId === thread.id;
              const actionPending =
                threadAction.isPending &&
                threadAction.variables?.threadId === thread.id;

              return (
                <div
                  key={thread.id}
                  className={cn(
                    "group/mail-row hover:bg-muted/50 relative flex items-center overflow-hidden rounded-xl transition-colors",
                    selected && "bg-muted ring-1 ring-border",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 gap-2.5 px-3 py-3 text-left"
                    onClick={() => {
                      selectThread(thread.id);
                      setActiveView("inbox");
                    }}
                  >
                    <span className="flex w-2 shrink-0 justify-center pt-1.5">
                      {thread.unread ? (
                        <span className="bg-primary size-2 rounded-full" />
                      ) : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            thread.unread ? "font-semibold" : "font-medium",
                          )}
                        >
                          {thread.senderName ?? thread.senderEmail}
                        </span>
                        {thread.priority === "high" ? (
                          <Sparkles className="text-primary size-3 shrink-0" />
                        ) : null}
                        <ClientDateTime
                          className="text-muted-foreground ml-auto max-w-20 shrink-0 truncate text-right text-[11px]"
                          value={thread.receivedAt}
                          format="inbox"
                        />
                      </span>

                      <span
                        className={cn(
                          "mt-1 block truncate text-sm",
                          thread.unread && "font-semibold",
                        )}
                      >
                        {thread.subject}
                      </span>
                      <span className="text-muted-foreground mt-1 block truncate text-xs">
                        {thread.snippet}
                      </span>
                      {thread.messageCount > 1 ? (
                        <span className="text-muted-foreground mt-1.5 block text-[11px]">
                          {thread.messageCount} messages
                        </span>
                      ) : null}
                    </span>
                  </button>

                  {mode !== "drafts" ? (
                    <div className="bg-muted/95 absolute right-2 flex translate-x-1 items-center gap-1 rounded-lg p-1 opacity-0 shadow-sm transition-all group-hover/mail-row:translate-x-0 group-hover/mail-row:opacity-100 group-focus-within/mail-row:translate-x-0 group-focus-within/mail-row:opacity-100">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={actionPending}
                        aria-label="Archive conversation"
                        onClick={() =>
                          threadAction.mutate({
                            threadId: thread.id,
                            action: "archive",
                          })
                        }
                      >
                        <Archive />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={actionPending}
                        aria-label={
                          thread.unread ? "Mark as read" : "Mark as unread"
                        }
                        onClick={() =>
                          threadAction.mutate({
                            threadId: thread.id,
                            action: thread.unread
                              ? "mark_read"
                              : "mark_unread",
                          })
                        }
                      >
                        {thread.unread ? <MailOpen /> : <Mail />}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>

      <div className="border-t p-2">
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          disabled={!canLoadMore || maxResults >= 50 || activeQuery.isFetching}
          onClick={() => setMaxResults((current) => Math.min(50, current + 12))}
        >
          <CheckSquare2 />
          {canLoadMore && maxResults < 50 ? "Load more mail" : "All mail loaded"}
        </Button>
      </div>
    </Card>
  );
}

function InboxSkeleton() {
  return (
    <div className="space-y-2 p-1">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-xl px-2 py-3">
          <Skeleton className="mt-1 size-2 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
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
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="bg-muted flex size-11 items-center justify-center rounded-full">
        <AlertCircle className="text-muted-foreground size-5" />
      </div>
      <p className="mt-4 text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
        {description}
      </p>
    </div>
  );
}
