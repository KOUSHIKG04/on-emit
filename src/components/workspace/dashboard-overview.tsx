"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { TablerIcon } from "@/components/icons";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckSquare2,
  Clock3,
  Inbox,
  MailCheck,
  MailWarning,
  MessageCircle,
  RefreshCw,
  Settings,
  // Sparkles,
  SquarePen,
  SunMedium,
} from "@/components/icons";

import { EventActions } from "@/components/calendar/event-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";

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
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const inbox = api.gmail.inbox.useQuery(
    { maxResults: 12 },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );

  const calendar = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 30_000,
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

  const generatedTime = now
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(now)
    : null;

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

  const summary = gmail.error
    ? "Connect Gmail in Settings to include your inbox in the daily brief."
    : calendar.error
      ? `${gmail.data?.unread ?? 0} unread messages are ready for review. Connect Calendar to complete your brief.`
      : `${gmail.data?.unread ?? 0} unread message${
          gmail.data?.unread === 1 ? "" : "s"
        } and ${todayMeetings.length} meeting${
          todayMeetings.length === 1 ? "" : "s"
        } are on your radar today.`;

  return (
    <div className="bg-background min-h-full w-full overflow-x-hidden">
      <div className="w-full p-0">
        <section className="bg-card flex w-full flex-col gap-6 border-b p-5 md:p-8 xl:flex-row xl:items-end xl:justify-between xl:p-10">
          <div className="max-w-4xl">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {dateLabel}
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl xl:text-5xl">
              {getGreeting(now)}, {userName}
            </h1>

            <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-6 md:text-base">
              {summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
        </section>

        <section className="bg-card grid overflow-hidden md:grid-cols-3">
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
            description={
              priorityThreads.length > 0
                ? `${priorityThreads.length} high priority in the latest mail`
                : "Messages waiting for your attention"
            }
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
        </section>

        <section className="grid w-full grid-cols-1 xl:grid-cols-12">
          <Card className="overflow-hidden rounded-none py-0 xl:col-span-8">
            <CardContent className="h-full p-6 md:p-8">
              <SectionLabel icon={SunMedium}>Your daily brief</SectionLabel>

              {isLoading ? (
                <BriefSkeleton />
              ) : (
                <div className="text-muted-foreground mt-6 space-y-1 text-sm leading-7 md:text-base">
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

          <Card className="rounded-none py-0 xl:col-span-4">
            <CardContent className="flex h-full min-h-[280px] flex-col p-6">
              <div className="flex items-center justify-between gap-3">
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

          <Card className="rounded-none py-0 xl:col-span-4">
            <CardContent className="flex h-full min-h-[230px] flex-col p-6">
              <SectionLabel>Quick actions</SectionLabel>

              <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ActionButton
                  icon={SquarePen}
                  label="Compose email"
                  onClick={() => openQuickAction("email")}
                />

                <ActionButton
                  icon={CalendarPlus}
                  label="New event"
                  onClick={() => openQuickAction("event")}
                />

                <ActionButton
                  icon={Inbox}
                  label="Unread mail"
                  onClick={openUnreadMail}
                />

                <ActionButton
                  icon={Settings}
                  label="Settings"
                  onClick={() => router.push("/settings")}
                />
              </div>

              <p className="text-muted-foreground mt-auto pt-5 text-xs leading-5">
                {generatedTime
                  ? `Brief refreshed at ${generatedTime}. Data is loaded from your connected Corsair workspace.`
                  : "Preparing your live Corsair brief…"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-none py-0 xl:col-span-8">
            <CardContent className="h-full p-6 md:p-8">
              <SectionLabel icon={CheckSquare2}>
                What needs you today
              </SectionLabel>

              {isLoading ? (
                <div className="mt-6 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : priorityThreads.length > 0 || todayMeetings.length > 0 ? (
                <div className="mt-5 divide-y">
                  {priorityThreads.slice(0, 3).map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      className="group hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors"
                      onClick={() => openThread(thread.id)}
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
                      className="flex items-center gap-3 px-2 py-3"
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
                <p className="text-muted-foreground mt-6 text-sm leading-6">
                  Nothing pressing — your inbox and calendar leave room for
                  focused work.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
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
    <div className="border-b last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
      <div className="flex min-h-40 items-start justify-between gap-5 p-5 md:p-6">
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              {error ? "—" : (value ?? 0)}
            </p>
          )}

          <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-5">
            {error ? "Connection unavailable" : description}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <span
            className={cn(
              "flex size-11 shrink-0 flex-col items-center justify-center rounded-xl",
              accent
                ? "bg-primary text-primary-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            <Icon className="size-5" />
          </span>
          <p className="mt-2 text-sm font-semibold">{title}</p>
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
    <div className="text-primary flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
      {Icon ? <Icon className="size-4" /> : null}
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
    <div className="text-muted-foreground bg-muted border-border mt-5 flex min-h-28 flex-1 items-center justify-center rounded-xl border p-5 text-center text-sm">
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: TablerIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-12 justify-start gap-2 px-3 py-2 text-left whitespace-normal"
      onClick={onClick}
    >
      <Icon className="text-primary size-4 shrink-0" />
      <span>{label}</span>
    </Button>
  );
}
