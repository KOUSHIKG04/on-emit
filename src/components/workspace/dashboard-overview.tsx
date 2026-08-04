"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { TablerIcon } from "@/components/icons";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckSquare2,
  ChevronDown,
  Clock3,
  Inbox,
  MailCheck,
  MailWarning,
  MessageCircle,
  RefreshCw,
  Settings,
  Sparkles,
  SquarePen,
  SunMedium,
} from "@/components/icons";

import { EventActions } from "@/components/calendar/event-actions";
import { QueuedAgentActions } from "@/components/workspace/analytics-bento";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api, type RouterOutputs } from "@/trpc/client";

function toEventDate(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
}

function isSameDay(value: string, reference: Date) {
  const date = toEventDate(value);

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

function getLocalDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function formatMeetingTime(value: string, allDay: boolean) {
  if (allDay) return "All day";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(toEventDate(value));
}

function getGreeting(date: Date | null) {
  if (!date) return "Welcome back";
  if (date.getHours() < 12) return "Good morning";
  if (date.getHours() < 18) return "Good afternoon";

  return "Good evening";
}

export function DashboardOverview({ userName }: { userName: string }) {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);

  const gmail = api.gmail.stats.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const inbox = api.gmail.inbox.useQuery(
    { maxResults: 12 },
    {
      staleTime: 120_000,
      refetchOnWindowFocus: false,
    },
  );

  const calendar = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const setAgentDraft = useWorkspaceStore((state) => state.setAgentDraft);

  const setCommandPaletteOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );

  const setQuickActionMode = useWorkspaceStore(
    (state) => state.setQuickActionMode,
  );

  const setCalendarDate = useWorkspaceStore((state) => state.setCalendarDate);

  const setCalendarView = useWorkspaceStore((state) => state.setCalendarView);

  const setInboxLabelFilter = useWorkspaceStore(
    (state) => state.setInboxLabelFilter,
  );

  const selectThread = useWorkspaceStore((state) => state.selectThread);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const meetings = calendar.data ?? [];
  const threads = inbox.data ?? [];

  const todayMeetings = now
    ? meetings.filter((event) => isSameDay(event.start, now))
    : [];

  const priorityThreads = threads.filter(
    (thread) => thread.priority === "high",
  );

  const nextMeeting = meetings[0];

  const isLoading = gmail.isLoading || inbox.isLoading || calendar.isLoading;

  const isRefreshing =
    gmail.isFetching || inbox.isFetching || calendar.isFetching;

  const dateLabel = now
    ? new Intl.DateTimeFormat(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(now)
    : "Your daily command center";

  async function refreshBrief() {
    await Promise.all([gmail.refetch(), inbox.refetch(), calendar.refetch()]);
    setNow(new Date());
  }

  function openQuickAction(mode: "email" | "event") {
    setQuickActionMode(mode);
    setCommandPaletteOpen(true);
  }

  function askAboutBrief() {
    const prioritySummary = priorityThreads
      .slice(0, 3)
      .map((thread) => thread.subject)
      .join(", ");

    const meetingSummary = todayMeetings
      .slice(0, 4)
      .map(
        (event) =>
          `${event.title} at ${formatMeetingTime(event.start, event.allDay)}`,
      )
      .join(", ");

    setAgentDraft(
      `Help me plan today from this daily brief. I have ${
        gmail.data?.unread ?? 0
      } unread messages and ${todayMeetings.length} meetings today.${
        prioritySummary
          ? ` High-priority email subjects: ${prioritySummary}.`
          : ""
      }${
        meetingSummary ? ` Today's schedule: ${meetingSummary}.` : ""
      } Tell me what to handle first and suggest the next best action.`,
    );

    router.push("/agent");
  }

  function openCalendar() {
    const date = new Date();

    setCalendarDate(getLocalDateKey(date));
    setCalendarView("day");
    router.push("/calendar");
  }

  function openUnreadMail() {
    setInboxLabelFilter("unread");
    router.push("/inbox");
  }

  function openThread(threadId: string) {
    selectThread(threadId);
    setInboxLabelFilter("all");
    router.push("/inbox");
  }

  return (
    <div className="bg-muted/25 flex min-h-[calc(100svh-4rem)] w-full font-sans">
      <div className="flex min-h-full w-full flex-1 flex-col">
        <section className="from-primary/10 via-card to-card border-primary/15 flex w-full flex-col justify-center overflow-hidden border-b bg-linear-to-br p-6 md:p-8 xl:flex-row xl:items-center xl:justify-between xl:p-10">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl xl:text-5xl">
              {getGreeting(now)}, {userName}
            </h1>
          </div>

          <div className="mt-7 xl:mt-0 xl:text-right">
            <p className="text-muted-foreground mb-3 text-xs font-medium">
              {dateLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isRefreshing}
                onClick={() => void refreshBrief()}
              >
                <RefreshCw
                  className={cn("size-4", isRefreshing && "animate-spin")}
                />
                Refresh
              </Button>

              <Button type="button" onClick={askAboutBrief}>
                <MessageCircle className="size-4" />
                Ask about this brief
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-card grid overflow-hidden border-b md:grid-cols-4">
          <MetricCard
            title="Read email"
            description="Messages already reviewed"
            value={gmail.data?.read}
            loading={gmail.isLoading}
            error={Boolean(gmail.error)}
            icon={MailCheck}
          />

          <MetricCard
            title="Unread email"
            description="Messages waiting for your attention"
            value={gmail.data?.unread}
            loading={gmail.isLoading}
            error={Boolean(gmail.error)}
            icon={MailWarning}
            accent
          />

          <MetricCard
            title="Meetings today"
            description={
              nextMeeting
                ? `Next: ${nextMeeting.title}`
                : "Your next seven days are clear"
            }
            value={todayMeetings.length}
            loading={calendar.isLoading || !now}
            error={Boolean(calendar.error)}
            icon={CalendarDays}
          />

          <MetricCard
            title="Priority mail"
            description={
              priorityThreads.length > 0
                ? "High-priority conversations in your latest mail"
                : "No urgent conversations detected"
            }
            value={priorityThreads.length}
            loading={inbox.isLoading}
            error={Boolean(inbox.error)}
            icon={Sparkles}
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col">
          {/* <div className="bg-card border-y px-6 py-5 md:px-8">
            <h2 className="text-xl font-semibold tracking-[-0.02em]">Today</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Review pending work, priorities, and your schedule.
            </p>
          </div> */}

          <div className="bg-card grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden border-b xl:grid-cols-10 xl:grid-rows-[auto_minmax(10rem,1fr)_auto]">
            <NeedsAttention
              isLoading={isLoading}
              priorityThreads={priorityThreads}
              todayMeetings={todayMeetings}
              onOpenThread={openThread}
            />

            <Card className="overflow-hidden rounded-none border-0 border-b py-0 shadow-none ring-0 xl:col-span-4 xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:border-r xl:border-b-0">
              <CardContent className="h-full p-5 md:p-6">
                <SectionLabel icon={SunMedium}>Your daily brief</SectionLabel>

                {isLoading ? (
                  <BriefSkeleton />
                ) : (
                  <div className="text-muted-foreground mt-5 max-w-[72ch] space-y-2 text-sm leading-6">
                    <p>
                      {gmail.error
                        ? "Your Gmail summary is unavailable until the Corsair Gmail connection is restored in Settings."
                        : gmail.data?.unread
                          ? `Your inbox has ${gmail.data.unread} unread message${
                              gmail.data.unread === 1 ? "" : "s"
                            }. ${
                              priorityThreads.length > 0
                                ? `${priorityThreads.length} of the most recent conversations ${
                                    priorityThreads.length === 1 ? "is" : "are"
                                  } marked high priority.`
                                : "None of the latest conversations has a strong urgency signal."
                            }`
                          : "Your inbox is clear with no unread messages waiting for review."}
                    </p>

                    <p>
                      {inbox.error
                        ? "Recent conversation details could not be loaded for this brief."
                        : threads.length > 0
                          ? `Recent mail includes “${
                              threads[0]?.subject ?? "No subject"
                            }”${
                              threads[1] ? ` and “${threads[1].subject}”` : ""
                            }.`
                          : "There are no recent inbox conversations to summarize."}
                    </p>

                    <p>
                      {calendar.error
                        ? "Your Google Calendar summary is unavailable until the connection is restored."
                        : todayMeetings.length > 0
                          ? `You have ${todayMeetings.length} meeting${
                              todayMeetings.length === 1 ? "" : "s"
                            } today. ${
                              nextMeeting
                                ? `Your next event is “${
                                    nextMeeting.title
                                  }” at ${formatMeetingTime(
                                    nextMeeting.start,
                                    nextMeeting.allDay,
                                  )}.`
                                : ""
                            }`
                          : "Your calendar is clear today, leaving you an open runway for focused work."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <QuickActions
              onComposeEmail={() => openQuickAction("email")}
              onCreateEvent={() => openQuickAction("event")}
              onOpenUnreadMail={openUnreadMail}
              onOpenSettings={() => router.push("/settings")}
            />

            <Card className="rounded-none border-0 border-b py-0 shadow-none ring-0 xl:col-span-3 xl:col-start-5 xl:row-span-2 xl:row-start-2 xl:border-r xl:border-b-0">
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionLabel icon={CalendarDays}>
                    Today&apos;s schedule
                  </SectionLabel>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={openCalendar}
                  >
                    Full calendar
                    <ArrowRight className="size-4" />
                  </Button>
                </div>

                {calendar.isLoading || !now ? (
                  <div className="mt-5 space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : calendar.error ? (
                  <EmptyBlock>
                    Calendar is unavailable. Check Settings.
                  </EmptyBlock>
                ) : todayMeetings.length === 0 ? (
                  <EmptyBlock>No meetings today — a clear runway.</EmptyBlock>
                ) : (
                  <div className="mt-5 space-y-2">
                    {todayMeetings.slice(0, 4).map((event) => (
                      <div
                        key={event.id}
                        className="bg-muted/35 flex items-center gap-3 rounded-xl border p-3"
                      >
                        <span className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                          <CalendarDays className="size-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {event.title}
                          </span>

                          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                            {formatMeetingTime(event.start, event.allDay)}
                            {event.location ? ` · ${event.location}` : ""}
                          </span>
                        </span>

                        <EventActions event={event} compact />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <QueuedAgentActions
              compact
              className="xl:col-span-3 xl:col-start-8 xl:row-span-3 xl:row-start-1"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

type InboxThread = RouterOutputs["gmail"]["inbox"][number];
type CalendarEvent = RouterOutputs["calendar"]["upcoming"][number];

function NeedsAttention({
  isLoading,
  priorityThreads,
  todayMeetings,
  onOpenThread,
}: {
  isLoading: boolean;
  priorityThreads: InboxThread[];
  todayMeetings: CalendarEvent[];
  onOpenThread: (threadId: string) => void;
}) {
  return (
    <Card className="rounded-none border-0 border-b py-0 shadow-none ring-0 xl:col-span-3 xl:col-start-5 xl:row-start-1 xl:border-r">
      <CardContent className="h-full p-4 sm:p-5">
        <SectionLabel icon={CheckSquare2}>What needs you today</SectionLabel>

        {isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : priorityThreads.length > 0 || todayMeetings.length > 0 ? (
          <div className="mt-3 divide-y">
            {priorityThreads.slice(0, 1).map((thread) => (
              <button
                key={thread.id}
                type="button"
                className="group hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors"
                onClick={() => onOpenThread(thread.id)}
              >
                <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <MailWarning className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {thread.subject}
                  </span>

                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                    {thread.senderName ?? thread.senderEmail}
                  </span>
                </span>

                <ArrowRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}

            {todayMeetings.slice(0, 1).map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-2 py-2.5"
              >
                <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Clock3 className="size-4" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {event.title}
                  </span>

                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {formatMeetingTime(event.start, event.allDay)}
                  </span>
                </span>

                <EventActions event={event} compact />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-4 text-sm leading-5">
            Nothing pressing — your inbox and calendar leave room for focused
            work.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions({
  onComposeEmail,
  onCreateEvent,
  onOpenUnreadMail,
  onOpenSettings,
}: {
  onComposeEmail: () => void;
  onCreateEvent: () => void;
  onOpenUnreadMail: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <Card className="rounded-none border-0 border-b py-0 shadow-none ring-0 xl:col-span-4 xl:col-start-1 xl:row-start-3 xl:border-t xl:border-r xl:border-b-0">
      <CardContent className="flex h-full items-center justify-between gap-4 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Quick actions</p>
          <p className="text-muted-foreground mt-1 truncate text-xs">
            Compose, schedule, search, or configure.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            id="focus-quick-actions-trigger"
            render={<Button type="button" variant="outline" size="sm" />}
          >
            Choose action
            <ChevronDown className="text-muted-foreground size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onClick={onComposeEmail}>
              <SquarePen />
              Compose email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateEvent}>
              <CalendarPlus />
              Create calendar event
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenUnreadMail}>
              <Inbox />
              Open unread mail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSettings}>
              <Settings />
              Open settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

type MetricCardProps = {
  title: string;
  description: string;
  value: number | undefined;
  loading: boolean;
  error: boolean;
  icon: TablerIcon;
  accent?: boolean;
};

function MetricCard({
  title,
  description,
  value,
  loading,
  error,
  icon: Icon,
  accent = false,
}: MetricCardProps) {
  return (
    <div className="relative min-h-36 border-b p-5 md:border-r md:border-b-0 md:p-6 md:last:border-r-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {loading ? (
            <Skeleton className="mt-5 h-10 w-20" />
          ) : (
            <p className="mt-5 text-4xl font-semibold tracking-[-0.03em]">
              {error ? "—" : (value ?? 0)}
            </p>
          )}

          <p className="text-muted-foreground mt-2 line-clamp-2 max-w-64 text-xs leading-5">
            {error ? "Connection unavailable" : description}
          </p>
        </div>

        <div>
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              accent
                ? "bg-primary text-primary-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            <Icon className="size-5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon?: TablerIcon;
  children: ReactNode;
}) {
  return (
    <div className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-[-0.01em]">
      {Icon ? <Icon className="text-primary size-4" /> : null}
      <span>{children}</span>
    </div>
  );
}

function BriefSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-11/12" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  );
}

function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground bg-muted/40 border-border/70 mt-5 flex min-h-28 flex-1 items-center justify-center rounded-xl border border-dashed p-5 text-center text-sm">
      {children}
    </div>
  );
}
