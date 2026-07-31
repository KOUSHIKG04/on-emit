"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Mail,
  MailOpen,
  Search,
  SlidersHorizontal,
  X,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";
import { ClientDateTime } from "@/components/shared/client-date-time";

const RECENT_SEARCHES_KEY = "on-emit.gmail-recent-searches";
const suggestions = [
  { label: "Unread", query: "is:unread" },
  { label: "Attachments", query: "has:attachment" },
  { label: "Last 7 days", query: "newer_than:7d" },
  { label: "Starred", query: "is:starred" },
] as const;

const operatorExamples = [
  {
    label: "From a sender",
    query: "from:person@example.com",
    description: "Find every conversation from one address.",
  },
  {
    label: "With attachments",
    query: "has:attachment",
    description: "Only show messages that contain files.",
  },
  {
    label: "After a date",
    query: "after:2026/07/01",
    description: "Limit results to a specific time period.",
  },
  {
    label: "Exact subject",
    query: 'subject:"project update"',
    description: "Search for words in the subject line.",
  },
] as const;

type SearchValues = { query: string };

function loadRecentSearches() {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
    ) as unknown;
    return Array.isArray(saved)
      ? saved
          .filter((item): item is string => typeof item === "string")
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

export function GmailSearch({
  variant = "page",
}: {
  variant?: "page" | "panel";
}) {
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const selectedThreadId = useWorkspaceStore(
    (state) => state.selectedSearchThreadId,
  );
  const selectThread = useWorkspaceStore((state) => state.selectSearchThread);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { register, handleSubmit, setValue, formState } = useForm<SearchValues>(
    {
      defaultValues: { query: "" },
    },
  );
  const queryRegistration = register("query", {
    required: "Enter a Gmail search query.",
    maxLength: { value: 2_048, message: "Search query is too long." },
  });

  useEffect(() => setRecentSearches(loadRecentSearches()), []);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const search = api.gmail.search.useQuery(
    { query: submittedQuery, maxResults: 25 },
    {
      enabled: Boolean(submittedQuery),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">(
    "all",
  );

  function applyStatusFilter(status: "all" | "unread" | "read") {
    setStatusFilter(status);
    const currentQuery = inputRef.current?.value ?? "";
    let nextQuery = currentQuery.replace(/\bis:(unread|read)\b/gi, "").trim();

    if (status === "unread") {
      nextQuery = nextQuery ? `${nextQuery} is:unread` : "is:unread";
    } else if (status === "read") {
      nextQuery = nextQuery ? `${nextQuery} is:read` : "is:read";
    }

    setValue("query", nextQuery, { shouldValidate: true });
    if (nextQuery) {
      setSubmittedQuery(nextQuery);
    }
  }

  function runSearch(values: SearchValues) {
    const query = values.query.trim();
    if (!query) return;

    setSubmittedQuery(query);
    const next = [
      query,
      ...recentSearches.filter((item) => item !== query),
    ].slice(0, 5);
    setRecentSearches(next);
    try {
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    } catch {
      // Search still works when browser storage is unavailable.
    }
  }

  function applyQuery(query: string) {
    setValue("query", query, { shouldValidate: true });
    void handleSubmit(runSearch)();
  }

  function clearHistory() {
    setRecentSearches([]);
    try {
      window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // The in-memory history is already cleared.
    }
  }

  const gmailDisconnected = search.error?.data?.code === "PRECONDITION_FAILED";

  return (
    <Card
      className={cn(
        "min-h-0 gap-0 overflow-hidden py-0",
        variant === "panel"
          ? "h-full rounded-none ring-0"
          : "mx-auto min-h-[640px] w-full max-w-5xl",
      )}
    >
      {variant === "panel" ? (
        <Collapsible defaultOpen className="shrink-0 border-b">
          <div className="flex h-16 items-center justify-between gap-2 px-4">
            <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2 text-left">
              <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-data-open:rotate-90" />
              <Clock3 className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate text-xs font-semibold uppercase">
                Recent searches
              </span>
              <span className="bg-muted text-muted-foreground ml-auto rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                {recentSearches.length}
              </span>
            </CollapsibleTrigger>

            {recentSearches.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
                onClick={clearHistory}
              >
                <X className="size-3.5" />
                Clear
              </Button>
            ) : null}
          </div>

          <CollapsibleContent>
            <div className="border-t px-4 py-3">
              {recentSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((query) => (
                    <Button
                      key={query}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="max-w-full"
                      onClick={() => applyQuery(query)}
                    >
                      <span className="truncate">{query}</span>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-xs">
                  Your recent Gmail searches will appear here.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <CardHeader
        className={cn(
          "shrink-0 border-b p-4 sm:p-5",
          variant === "panel" && "pb-2 sm:pb-2",
          variant === "page" && "p-7 md:p-9",
        )}
      >
        {variant === "page" ? (
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
              <Search className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold sm:text-lg">
                Advanced Gmail search
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Use Gmail operators or select filters below. Press / to focus
                search.
              </CardDescription>
            </div>
          </div>
        ) : null}

        <form
          className={cn(
            "flex flex-col gap-2 sm:flex-row",
            variant === "page" && "mt-3 md:mt-6",
          )}
          onSubmit={handleSubmit(runSearch)}
          noValidate
        >
          <Field
            className="min-w-0 flex-1"
            data-invalid={Boolean(formState.errors.query)}
          >
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                {...queryRegistration}
                ref={(node) => {
                  queryRegistration.ref(node);
                  inputRef.current = node;
                }}
                aria-label="Gmail search query"
                aria-invalid={Boolean(formState.errors.query)}
                className="pl-9 text-xs sm:text-sm"
                placeholder="from:friend@example.com is:unread"
              />
            </div>
            <FieldError errors={[formState.errors.query]} />
          </Field>

          <Button type="submit" disabled={search.isFetching} size="sm">
            <Search className="size-4" />
            {search.isFetching ? "Searching..." : "Search"}
          </Button>
        </form>

        <div className="w-full pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-full justify-between gap-1.5 px-2.5 text-xs font-normal"
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span className="flex-1 text-left">Filters</span>
                  <span className="text-muted-foreground">
                    {statusFilter === "unread"
                      ? "Unread"
                      : statusFilter === "read"
                        ? "Read"
                        : "All mail"}
                  </span>
                  <ChevronDown className="size-3 opacity-60" />
                </Button>
              }
            />
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={statusFilter}
                onValueChange={(val) =>
                  applyStatusFilter(val as "all" | "unread" | "read")
                }
              >
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuRadioItem value="all">
                  All messages
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="unread">
                  Unread only (is:unread)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="read">
                  Read only (is:read)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Operators</DropdownMenuLabel>
                {operatorExamples.map((example) => (
                  <DropdownMenuItem
                    key={example.query}
                    className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
                    onClick={() => applyQuery(example.query)}
                  >
                    <span className="text-xs font-medium">{example.label}</span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {example.query}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid w-full grid-cols-2 gap-1 pt-2 sm:grid-cols-4">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.query}
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 w-full justify-center text-xs"
              onClick={() => applyQuery(suggestion.query)}
            >
              {suggestion.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-0">
        {variant === "page" && !submittedQuery && recentSearches.length > 0 ? (
          <div className={cn("border-b p-4", variant === "page" && "p-7")}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground flex items-center gap-2 text-xs font-semibold uppercase">
                <Clock3 className="size-3.5" /> Recent searches
              </p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearHistory}
              >
                <X /> Clear
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((query) => (
                <Button
                  key={query}
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => applyQuery(query)}
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {search.isLoading ? <SearchSkeleton /> : null}

        {gmailDisconnected ? (
          <SearchState
            title="Gmail is not connected"
            description="Connect Gmail to this workspace before searching."
          />
        ) : null}

        {search.error && !gmailDisconnected ? (
          <SearchState
            title="Search failed"
            description={search.error.message}
          />
        ) : null}

        {submittedQuery &&
        !search.isLoading &&
        !search.error &&
        search.data?.length === 0 ? (
          <SearchState
            title="No matching conversations"
            description={`Gmail returned no results for “${submittedQuery}”.`}
          />
        ) : null}

        {search.data && search.data.length > 0 ? (
          <div>
            <p className="bg-background/95 text-muted-foreground sticky top-0 z-10 border-b px-4 py-2 text-xs backdrop-blur">
              {search.data.length} result{search.data.length === 1 ? "" : "s"}{" "}
              for {submittedQuery}
            </p>
            <div className="divide-y">
              {search.data.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={cn(
                    "hover:bg-muted/60 flex w-full gap-3 px-4 py-4 text-left transition-colors",
                    selectedThreadId === thread.id && "bg-muted",
                  )}
                  onClick={() => selectThread(thread.id)}
                >
                  {thread.unread ? (
                    <Mail className="text-primary mt-1 size-4 shrink-0" />
                  ) : (
                    <MailOpen className="text-muted-foreground mt-1 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p
                        className={cn(
                          "truncate text-sm",
                          thread.unread && "font-semibold",
                        )}
                      >
                        {thread.senderName ?? thread.senderEmail}
                      </p>
                      <ClientDateTime
                        className="text-muted-foreground shrink-0 text-xs"
                        value={thread.receivedAt}
                        format="search"
                      />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">
                      {thread.subject}
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                      {thread.snippet}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SearchSkeleton() {
  return (
    <div className="space-y-5 p-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function SearchState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
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
