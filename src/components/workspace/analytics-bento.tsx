"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Ghost2,
  Inbox,
  RefreshCw,
} from "@/components/icons";
import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import type { ChartConfig } from "@/components/dither-kit/chart-context";
import { Grid } from "@/components/dither-kit/grid";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";

const emailChartConfig = {
  messages: { label: "Messages", color: "orange" },
  unread: { label: "Unread", color: "red" },
} satisfies ChartConfig;

const meetingChartConfig = {
  meetings: { label: "Meetings", color: "orange" },
} satisfies ChartConfig;

const attendanceChartConfig = {
  accepted: { label: "Accepted meetings", color: "orange" },
  other: { label: "Other or no RSVP", color: "grey" },
} satisfies ChartConfig;

const fallbackPastRange = {
  timeMin: "1970-01-01T00:00:00.000Z",
  timeMax: "1970-01-02T00:00:00.000Z",
};

type QueuedAgentAction = {
  id: string;
  conversationId: string;
  request: string;
  summary: string;
  createdAt: number;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readPendingActions() {
  try {
    const stored = window.localStorage.getItem("on-emit.agent-conversations");
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(parsed)) return [];

    const pending: QueuedAgentAction[] = [];
    for (const conversationValue of parsed) {
      const conversation = asRecord(conversationValue);
      if (
        typeof conversation?.id !== "string" ||
        !Array.isArray(conversation.actions)
      ) {
        continue;
      }

      for (const actionValue of conversation.actions) {
        const action = asRecord(actionValue);
        if (
          action?.status !== "pending" ||
          typeof action.id !== "string" ||
          typeof action.request !== "string" ||
          typeof action.summary !== "string" ||
          typeof action.createdAt !== "number"
        ) {
          continue;
        }

        pending.push({
          id: action.id,
          conversationId: conversation.id,
          request: action.request,
          summary: action.summary,
          createdAt: action.createdAt,
        });
      }
    }

    return pending.sort((first, second) => second.createdAt - first.createdAt);
  } catch {
    return [];
  }
}

function getLocalDayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function parseCalendarDate(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
}

function createDayBuckets(direction: "past" | "future") {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(
      direction === "past"
        ? today.getDate() - (6 - index)
        : today.getDate() + index,
    );

    return {
      key: getLocalDayKey(date),
      label: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
      }).format(date),
      messages: 0,
      unread: 0,
      meetings: 0,
    };
  });
}

function formatEmailActivity(
  rows: Array<{ date: string; messages: number; unread: number }> | undefined,
) {
  return (rows ?? []).map((row) => ({
    key: row.date,
    label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
      new Date(`${row.date}T12:00:00Z`),
    ),
    messages: row.messages,
    unread: row.unread,
    meetings: 0,
  }));
}

function formatMeetingActivity(events: Array<{ start: string }> | undefined) {
  const buckets = createDayBuckets("future");
  const bucketsByDate = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const event of events ?? []) {
    const bucket = bucketsByDate.get(
      getLocalDayKey(parseCalendarDate(event.start)),
    );
    if (bucket) bucket.meetings += 1;
  }

  return buckets;
}

export function QueuedAgentActions({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [queuedActions, setQueuedActions] = useState<QueuedAgentAction[]>([]);
  const setActiveAgentConversationId = useWorkspaceStore(
    (state) => state.setActiveAgentConversationId,
  );

  useEffect(() => {
    const updateActions = () => setQueuedActions(readPendingActions());
    updateActions();
    window.addEventListener("storage", updateActions);
    window.addEventListener("focus", updateActions);

    return () => {
      window.removeEventListener("storage", updateActions);
      window.removeEventListener("focus", updateActions);
    };
  }, []);

  return (
    <Card
      className={cn(
        "min-w-0 rounded-none border-0 py-0 shadow-none ring-0",
        className,
      )}
    >
      <CardHeader className={cn("p-5 sm:p-6", compact && "p-4 sm:p-5")}>
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 font-sans font-semibold">
            <Clock3 className="text-primary size-4" />
            Queued agent actions
          </CardTitle>
          <CardDescription className="mt-1">
            Review email and calendar changes before the agent runs them.
          </CardDescription>
        </div>
        <CardAction>
          <span className="bg-primary/10 text-primary inline-flex min-w-7 items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
            {queuedActions.length}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent
        className={cn(
          "flex min-h-0 flex-1 px-5 pb-5 sm:px-6 sm:pb-6",
          compact && "px-4 pb-4 sm:px-5 sm:pb-5",
        )}
      >
        {queuedActions.length > 0 ? (
          <div className="grid w-full content-start gap-2">
            {queuedActions.slice(0, 4).map((action) => (
              <button
                key={action.id}
                type="button"
                className="bg-muted/30 hover:border-primary/20 hover:bg-muted/60 group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                onClick={() => {
                  setActiveAgentConversationId(action.conversationId);
                  router.push("/agent");
                }}
              >
                <span className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Ghost2 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {action.request}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block truncate text-xs">
                    {action.summary}
                  </span>
                </span>
                <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              "bg-primary/[0.04] flex w-full flex-1 flex-col items-center justify-center rounded-xl px-4 text-center",
              compact ? "min-h-24" : "min-h-36",
            )}
          >
            <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Inbox className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold">Queue is clear</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              No email or calendar actions need approval.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsBento() {
  const email = api.gmail.activity.useQuery(undefined, {
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const calendar = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const emailActivity = useMemo(
    () => formatEmailActivity(email.data),
    [email.data],
  );

  const meetingActivity = useMemo(
    () => formatMeetingActivity(calendar.data),
    [calendar.data],
  );

  const isRefreshing = email.isFetching || calendar.isFetching;

  return (
    <>
      <ChartBentoCard
        className="rounded-none border-0 border-b lg:col-span-7 lg:border-r lg:border-b-0"
        title="Email activity"
        description="Inbox volume and unread mail across the last seven days"
        loading={email.isLoading}
        unavailable={Boolean(email.error)}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Refresh analytics"
            aria-label="Refresh analytics"
            disabled={isRefreshing}
            onClick={() =>
              void Promise.all([email.refetch(), calendar.refetch()])
            }
          >
            <RefreshCw className={cn(isRefreshing && "animate-spin")} />
          </Button>
        }
      >
        <AreaChart
          data={emailActivity}
          config={emailChartConfig}
          animate={false}
          className="h-48 sm:h-52"
          margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
        >
          <Grid />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
          <Area dataKey="messages" variant="gradient" />
          <Area dataKey="unread" variant="dotted" />
          <Tooltip labelKey="label" variant="frosted-glass" />
        </AreaChart>
      </ChartBentoCard>

      <ChartBentoCard
        className="rounded-none border-0 border-b lg:col-span-5 lg:border-b-0"
        title="Calendar load"
        description="Meetings and events scheduled for the next seven days"
        loading={calendar.isLoading}
        unavailable={Boolean(calendar.error)}
      >
        <BarChart
          data={meetingActivity}
          config={meetingChartConfig}
          animate={false}
          className="h-48 sm:h-52"
          margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
        >
          <Grid />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
          <Bar dataKey="meetings" variant="hatched" />
          <Tooltip labelKey="label" variant="frosted-glass" />
        </BarChart>
      </ChartBentoCard>
    </>
  );
}

export function AnalyticsDrawerContent({
  open,
  userEmail,
}: {
  open: boolean;
  userEmail: string;
}) {
  const [pastRange, setPastRange] = useState<typeof fallbackPastRange | null>(
    null,
  );

  useEffect(() => {
    if (!open || pastRange) return;

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 90);

    setPastRange({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
    });
  }, [open, pastRange]);

  const email = api.gmail.activity.useQuery(undefined, {
    enabled: open,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
  const calendar = api.calendar.upcoming.useQuery(undefined, {
    enabled: open,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
  const pastCalendar = api.calendar.range.useQuery(
    pastRange ?? fallbackPastRange,
    {
      enabled: open && Boolean(pastRange),
      staleTime: 300_000,
      refetchOnWindowFocus: false,
    },
  );

  const emailActivity = useMemo(
    () => formatEmailActivity(email.data),
    [email.data],
  );

  const meetingActivity = useMemo(
    () => formatMeetingActivity(calendar.data),
    [calendar.data],
  );

  const isRefreshing =
    email.isFetching || calendar.isFetching || pastCalendar.isFetching;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <ChartBentoCard
        title="Email activity"
        description="Inbox volume and unread mail across the last seven days"
        loading={email.isLoading}
        unavailable={Boolean(email.error)}
        action={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Refresh analytics"
            aria-label="Refresh analytics"
            disabled={isRefreshing}
            onClick={() =>
              void Promise.all([
                email.refetch(),
                calendar.refetch(),
                pastCalendar.refetch(),
              ])
            }
          >
            <RefreshCw className={cn(isRefreshing && "animate-spin")} />
          </Button>
        }
      >
        <AreaChart
          data={emailActivity}
          config={emailChartConfig}
          animate={false}
          className="h-60 sm:h-72"
          margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
        >
          <Grid />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
          <Area dataKey="messages" variant="gradient" />
          <Area dataKey="unread" variant="dotted" />
          <Tooltip labelKey="label" variant="frosted-glass" />
        </AreaChart>
      </ChartBentoCard>

      <ChartBentoCard
        title="Calendar load"
        description="Meetings and events scheduled for the next seven days"
        loading={calendar.isLoading}
        unavailable={Boolean(calendar.error)}
      >
        <BarChart
          data={meetingActivity}
          config={meetingChartConfig}
          animate={false}
          className="h-60 sm:h-72"
          margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
        >
          <Grid />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(value) => Math.round(value).toString()} />
          <Bar dataKey="meetings" variant="hatched" />
          <Tooltip labelKey="label" variant="frosted-glass" />
        </BarChart>
      </ChartBentoCard>

      <MeetingAttendanceCard
        events={pastCalendar.data ?? []}
        userEmail={userEmail}
        loading={pastCalendar.isLoading || !pastRange}
        unavailable={Boolean(pastCalendar.error)}
      />
    </div>
  );
}

function MeetingAttendanceCard({
  events,
  userEmail,
  loading,
  unavailable,
}: {
  events: Array<{
    allDay: boolean;
    attendees: Array<{
      email: string;
      responseStatus: string | null;
    }>;
  }>;
  userEmail: string;
  loading: boolean;
  unavailable: boolean;
}) {
  const meetings = events.filter((event) => !event.allDay);
  const acceptedMeetings = meetings.filter((event) =>
    event.attendees.some(
      (attendee) =>
        attendee.email.toLowerCase() === userEmail.toLowerCase() &&
        attendee.responseStatus === "accepted",
    ),
  ).length;
  const otherMeetings = Math.max(meetings.length - acceptedMeetings, 0);
  const acceptedPercent =
    meetings.length > 0
      ? Math.round((acceptedMeetings / meetings.length) * 100)
      : 0;

  return (
    <Card className="py-0 shadow-none ring-0">
      <CardHeader className="p-5 sm:p-6">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 font-sans font-semibold">
            <CalendarDays className="text-primary size-4" />
            Meeting attendance
          </CardTitle>
          <CardDescription className="mt-1">
            Accepted meetings compared with all timed events from the last 90
            days
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
        {loading ? (
          <Skeleton className="h-56 w-full" />
        ) : unavailable ? (
          <div className="text-muted-foreground bg-muted/35 flex min-h-44 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm">
            Connect Google Calendar in Settings to view meeting attendance.
          </div>
        ) : (
          <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
            <PieChart
              data={[
                { name: "accepted", value: acceptedMeetings },
                { name: "other", value: otherMeetings },
              ]}
              config={attendanceChartConfig}
              className="mx-auto size-64"
              centerValue={`${acceptedPercent}%`}
              centerLabel="accepted"
              ariaLabel={`${acceptedMeetings} accepted meetings out of ${meetings.length} total meetings`}
            />

            <div className="min-w-0 space-y-3">
              <AttendanceStat
                icon={CheckCircle2}
                label="Accepted meetings"
                value={acceptedMeetings}
                accent
              />
              <AttendanceStat
                icon={Clock3}
                label="Other or no RSVP"
                value={otherMeetings}
              />
              <div className="pt-3">
                <div className="border-border flex items-center justify-between gap-4 rounded-md border px-3 py-3 text-sm">
                  <span className="text-muted-foreground">Total meetings</span>
                  <span className="font-semibold tabular-nums">
                    {meetings.length}
                  </span>
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Attendance is estimated from your Google Calendar RSVP status;
                  Calendar does not report whether you joined a call.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceStat({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: typeof Clock3;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          accent
            ? "bg-primary/15 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="text-muted-foreground min-w-0 flex-1 text-sm">
        {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function ChartBentoCard({
  className,
  title,
  description,
  loading,
  unavailable,
  action,
  children,
}: {
  className?: string;
  title: string;
  description: string;
  loading: boolean;
  unavailable: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 rounded-2xl border py-0 shadow-none ring-0",
        className,
      )}
    >
      <CardHeader className="p-5 pb-0 sm:p-6 sm:pb-0">
        <div className="min-w-0">
          <CardTitle className="font-sans font-semibold">{title}</CardTitle>
          <CardDescription className="mt-1">
            {unavailable ? "Connect this service in Settings." : description}
          </CardDescription>
        </div>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="min-w-0 p-5 pt-4 sm:p-6 sm:pt-4">
        {loading ? <Skeleton className="h-48 w-full sm:h-52" /> : children}
      </CardContent>
    </Card>
  );
}
