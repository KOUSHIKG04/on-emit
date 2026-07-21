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
import { Switch } from "@/components/ui/switch";
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
  const [maxResults, setMaxResults] = useState(25);
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

  const stats = api.gmail.stats.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

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
    async onMutate(variables) {
      await utils.gmail.inbox.cancel();
      await utils.gmail.stats.cancel();

      const previousInbox = utils.gmail.inbox.getData({ maxResults });

      if (previousInbox) {
        utils.gmail.inbox.setData({ maxResults }, (old) => {
          if (!old) return old;
          return old.map((t) => {
            if (t.id === variables.threadId) {
              if (variables.action === "mark_read") {
                return { ...t, unread: false };
              }
              if (variables.action === "mark_unread") {
                return { ...t, unread: true };
              }
            }
            return t;
          });
        });
      }

      return { previousInbox };
    },
    onError(_err, _variables, context) {
      if (context?.previousInbox) {
        utils.gmail.inbox.setData({ maxResults }, context.previousInbox);
      }
    },
    async onSettled() {
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
    selectThread(null);
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
        <div className="flex h-16 w-full max-w-full min-w-0 shrink-0 items-center gap-1.5 border-b px-2.5 sm:px-3">
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 scrollbar-none">
            {mailboxTabs.map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.value;

              const count =
                tab.value === "inbox"
                  ? stats.data?.total
                  : tab.value === "priority" && inbox.data
                    ? inbox.data.filter((t) => t.priority === "high").length
                    : tab.value === "drafts" && drafts.data
                      ? drafts.data.length
                      : null;

              return (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "text-muted-foreground hover:text-foreground flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors whitespace-nowrap",
                    active &&
                      "bg-background text-foreground shadow-xs ring-1 ring-border",
                  )}
                  onClick={() => changeMode(tab.value)}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {typeof count === "number" && count > 0 ? (
                    <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1">
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
        </div>

        <div className="space-y-2 p-2.5 sm:p-3">
          <label className="focus-within:border-ring focus-within:ring-ring/30 flex h-9 w-full items-center gap-1.5 rounded-lg border px-2.5 transition-shadow focus-within:ring-2">
            <Search className="text-muted-foreground size-3.5 shrink-0" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder={sidebar ? "Search mail..." : "Search sender, subject, or message"}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd className="text-muted-foreground rounded border px-1 py-0.5 font-mono text-[9px]">
              /
            </kbd>
          </label>

          <div className="border-border/60 bg-muted/20 flex h-8 items-center justify-between gap-2 rounded-lg border px-2.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Mail className="text-muted-foreground size-3.5 shrink-0" />
              Unread only
            </span>
            <Switch
              checked={labelFilter === "unread"}
              onCheckedChange={(checked) =>
                setLabelFilter(checked ? "unread" : "all")
              }
              aria-label="Filter unread messages"
            />
          </div>
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
                    "group/mail-row hover:bg-muted/50 flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-transparent p-2.5 transition-colors",
                    selected && "bg-muted ring-1 ring-border border-border",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 flex-col text-left outline-none"
                    onClick={() => {
                      selectThread(thread.id);
                      setActiveView("inbox");
                      if (thread.unread) {
                        threadAction.mutate({
                          threadId: thread.id,
                          action: "mark_read",
                        });
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {thread.unread ? (
                          <span className="bg-primary size-2 shrink-0 rounded-full" />
                        ) : null}
                        <span
                          className={cn(
                            "truncate text-sm",
                            thread.unread
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/90",
                          )}
                        >
                          {thread.senderName ?? thread.senderEmail}
                        </span>
                        {thread.priority === "high" ? (
                          <Sparkles className="text-primary size-3 shrink-0" />
                        ) : null}
                      </div>

                      <ClientDateTime
                        className="text-muted-foreground ml-auto shrink-0 text-right text-[11px]"
                        value={thread.receivedAt}
                        format="inbox"
                      />
                    </div>

                    <span
                      className={cn(
                        "mt-1 block truncate text-sm",
                        thread.unread
                          ? "font-semibold text-foreground"
                          : "font-medium text-foreground/80",
                      )}
                    >
                      {thread.subject}
                    </span>

                    <span className="text-muted-foreground mt-1 block truncate text-xs">
                      {thread.snippet}
                    </span>

                    {thread.messageCount > 1 ? (
                      <span className="text-muted-foreground/80 mt-1.5 block text-[11px]">
                        {thread.messageCount} messages
                      </span>
                    ) : null}
                  </button>

                  {mode !== "drafts" ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={actionPending}
                        aria-label="Archive conversation"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted/80"
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
                        className="text-muted-foreground hover:text-foreground hover:bg-muted/80"
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
          disabled={!canLoadMore || maxResults >= 500 || activeQuery.isFetching}
          onClick={() => setMaxResults((current) => Math.min(500, current + 50))}
        >
          <CheckSquare2 />
          {canLoadMore && maxResults < 500
            ? `Load more mail (${threads?.length ?? 0} shown)`
            : "All mail loaded"}
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
