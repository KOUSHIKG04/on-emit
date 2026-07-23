"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { TablerIcon } from "@/components/icons";
import {
  ArrowRight,
  CalendarDays,
  ChartBar,
  Clock3,
  Ghost2,
  Inbox,
  MailWarning,
  RefreshCw,
} from "@/components/icons";
import { Area } from "@/components/dither-kit/area";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Bar } from "@/components/dither-kit/bar";
import { BarChart } from "@/components/dither-kit/bar-chart";
import type { ChartConfig } from "@/components/dither-kit/chart-context";
import { Grid } from "@/components/dither-kit/grid";
import { Tooltip } from "@/components/dither-kit/tooltip";
import { XAxis } from "@/components/dither-kit/x-axis";
import { YAxis } from "@/components/dither-kit/y-axis";
import { Button } from "@/components/ui/button";
import {
  Card,
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

type AnalyticsAction = {
  id: string;
  conversationId: string;
  conversationTitle: string;
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

    const pending: AnalyticsAction[] = [];
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
          conversationTitle:
            typeof conversation.title === "string"
              ? conversation.title
              : "Agent conversation",
          request: action.request,
          summary: action.summary,
          createdAt: action.createdAt,
        });
      }
    }

    return pending.sort((a, b) => b.createdAt - a.createdAt);
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

function createDayBuckets() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));

    return {
      key: getLocalDayKey(date),
      label: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
      }).format(date),
      messages: 0,
      unread: 0,
    };
  });
}

function createMeetingBuckets() {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() + index);

    return {
      key: getLocalDayKey(date),
      label: new Intl.DateTimeFormat(undefined, {
        weekday: "short",
      }).format(date),
      meetings: 0,
    };
  });
}

export function AnalyticsDashboard() {
  const router = useRouter();
  const [queuedActions, setQueuedActions] = useState<AnalyticsAction[]>([]);
  const setActiveAgentConversationId = useWorkspaceStore(
    (state) => state.setActiveAgentConversationId,
  );
  const gmailStats = api.gmail.stats.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const inbox = api.gmail.inbox.useQuery(
    { maxResults: 50 },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );
  const calendar = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const emailActivity = createDayBuckets();
  const emailBuckets = new Map(
    emailActivity.map((bucket) => [bucket.key, bucket]),
  );

  for (const thread of inbox.data ?? []) {
    if (!thread.receivedAt) continue;
    const bucket = emailBuckets.get(
      getLocalDayKey(new Date(thread.receivedAt)),
    );
    if (!bucket) continue;

    bucket.messages += 1;
    if (thread.unread) bucket.unread += 1;
  }

  const meetingActivity = createMeetingBuckets();
  const meetingBuckets = new Map(
    meetingActivity.map((bucket) => [bucket.key, bucket]),
  );

  for (const event of calendar.data ?? []) {
    const bucket = meetingBuckets.get(
      getLocalDayKey(parseCalendarDate(event.start)),
    );
    if (bucket) bucket.meetings += 1;
  }

  const priorityCount = (inbox.data ?? []).filter(
    (thread) => thread.priority === "high",
  ).length;
  const isRefreshing =
    gmailStats.isFetching || inbox.isFetching || calendar.isFetching;

  useEffect(() => {
    setQueuedActions(readPendingActions());
  }, []);

  async function refreshAnalytics() {
    await Promise.all([
      gmailStats.refetch(),
      inbox.refetch(),
      calendar.refetch(),
    ]);
  }

  return (
    <div className="bg-card min-h-full w-full">
      <section className="flex flex-col gap-5 border-b p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
        <div>
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            Workspace pulse
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Email and calendar analytics
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
            A current view of inbox volume, priorities, and the next seven days.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isRefreshing}
          onClick={() => void refreshAnalytics()}
        >
          <RefreshCw className={cn(isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </section>

      <div>
        <section className="grid sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Inbox messages"
            value={gmailStats.data?.total}
            description="All mail currently in Inbox"
            icon={Inbox}
            loading={gmailStats.isLoading}
            unavailable={Boolean(gmailStats.error)}
          />
          <MetricCard
            label="Unread"
            value={gmailStats.data?.unread}
            description="Waiting for your attention"
            icon={MailWarning}
            loading={gmailStats.isLoading}
            unavailable={Boolean(gmailStats.error)}
            accent
          />
          <MetricCard
            label="High priority"
            value={priorityCount}
            description="Across the latest 50 threads"
            icon={ChartBar}
            loading={inbox.isLoading}
            unavailable={Boolean(inbox.error)}
          />
          <MetricCard
            label="Next 7 days"
            value={calendar.data?.length}
            description="Upcoming calendar events"
            icon={CalendarDays}
            loading={calendar.isLoading}
            unavailable={Boolean(calendar.error)}
          />
        </section>

        <section className="grid xl:grid-cols-2">
          <ChartCard
            title="Recent email activity"
            description="Latest inbox threads received over the last seven days"
            unavailable={Boolean(inbox.error)}
            loading={inbox.isLoading}
          >
            <AreaChart
              data={emailActivity}
              config={emailChartConfig}
              className="h-64 sm:h-72"
              margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
            >
              <Grid />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value) => Math.round(value).toString()} />
              <Area dataKey="messages" variant="gradient" />
              <Area dataKey="unread" variant="dotted" />
              <Tooltip labelKey="label" variant="frosted-glass" />
            </AreaChart>
          </ChartCard>

          <ChartCard
            title="Calendar load"
            description="Meetings and events scheduled for the next seven days"
            unavailable={Boolean(calendar.error)}
            loading={calendar.isLoading}
          >
            <BarChart
              data={meetingActivity}
              config={meetingChartConfig}
              className="h-64 sm:h-72"
              margins={{ top: 18, left: 30, right: 12, bottom: 24 }}
            >
              <Grid />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value) => Math.round(value).toString()} />
              <Bar dataKey="meetings" variant="hatched" />
              <Tooltip labelKey="label" variant="frosted-glass" />
            </BarChart>
          </ChartCard>
        </section>

        <section className="border-b p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="text-primary size-4" />
              Queued agent actions
            </p>
            <p className="text-muted-foreground text-xs">
              Review write actions before the agent runs them.
            </p>
          </div>

          {queuedActions.length > 0 ? (
            <div className="mt-4 grid border-t sm:grid-cols-2">
              {queuedActions.slice(0, 4).map((action) => (
                <article
                  key={action.id}
                  className="flex min-w-0 flex-col gap-3 border-r border-b p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Ghost2 className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {action.request}
                      </p>
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-5">
                        {action.summary}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-auto w-full justify-between"
                    onClick={() => {
                      setActiveAgentConversationId(action.conversationId);
                      router.push("/agent");
                    }}
                  >
                    Review in Agent
                    <ArrowRight />
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground mt-4 flex items-center gap-3 border-t py-5 text-sm">
              <Ghost2 className="size-4" />
              No actions are waiting for approval.
            </div>
          )}
        </section>

        {(gmailStats.error ?? inbox.error ?? calendar.error) && (
          <p className="text-muted-foreground border-b px-5 py-4 text-xs sm:px-6 lg:px-8">
            Connect the unavailable Google service in Settings to complete these
            analytics.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  loading,
  unavailable,
  accent = false,
}: {
  label: string;
  value: number | undefined;
  description: string;
  icon: TablerIcon;
  loading: boolean;
  unavailable: boolean;
  accent?: boolean;
}) {
  return (
    <Card className="gap-4 rounded-none border-r border-b py-5 shadow-none ring-0">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <CardDescription>{label}</CardDescription>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20" />
          ) : (
            <CardTitle className="mt-1 text-3xl font-semibold tabular-nums">
              {unavailable ? "—" : (value ?? 0).toLocaleString()}
            </CardTitle>
          )}
        </div>
        <div
          className={cn(
            "bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg",
            accent && "bg-primary/15 text-primary",
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">
        {unavailable ? "Service unavailable" : description}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  description,
  unavailable,
  loading,
  children,
}: {
  title: string;
  description: string;
  unavailable: boolean;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 rounded-none border-r border-b py-0 shadow-none ring-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {unavailable ? "Connect this service in Settings." : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 pb-6">
        {loading ? <Skeleton className="h-64 w-full sm:h-72" /> : children}
      </CardContent>
    </Card>
  );
}
