"use client";

import {
  CalendarDays,
  MailCheck,
  MailWarning,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/client";

function isToday(value: string) {
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatMeetingTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function DashboardOverview() {
  const gmail = api.gmail.stats.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const calendar = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const meetings = calendar.data ?? [];
  const todayMeetings = meetings.filter((event) => isToday(event.start));
  const nextMeeting = meetings[0];

  return (
    <div className="bg-border grid min-h-full gap-px lg:grid-cols-3 lg:grid-rows-[minmax(190px,auto)_minmax(0,1fr)]">
      <MetricCard
        title="Unread email"
        description="Messages waiting in your Gmail inbox"
        value={gmail.data?.unread}
        loading={gmail.isLoading}
        error={gmail.error?.message}
        icon={MailWarning}
      />
      <MetricCard
        title="Read email"
        description="Messages already read in your Gmail inbox"
        value={gmail.data?.read}
        loading={gmail.isLoading}
        error={gmail.error?.message}
        icon={MailCheck}
      />
      <MetricCard
        title="Meetings"
        description={`${todayMeetings.length} today - next seven days`}
        value={calendar.data?.length}
        loading={calendar.isLoading}
        error={calendar.error?.message}
        icon={CalendarDays}
      />

      <Card className="rounded-none ring-0 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            Daily brief
          </CardTitle>
          <CardDescription>
            A live summary of what needs your attention today.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {gmail.isLoading || calendar.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          ) : (
            <div className="grid gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3">
              <BriefItem
                label="Inbox"
                value={
                  gmail.error
                    ? "Gmail data is unavailable. Check Settings."
                    : gmail.data?.unread
                      ? `${gmail.data.unread} unread message${gmail.data.unread === 1 ? "" : "s"} need review.`
                      : "Your inbox has no unread messages."
                }
              />
              <BriefItem
                label="Today"
                value={
                  calendar.error
                    ? "Calendar data is unavailable. Check Settings."
                    : todayMeetings.length > 0
                      ? `${todayMeetings.length} meeting${todayMeetings.length === 1 ? "" : "s"} scheduled today.`
                      : "No meetings are scheduled today."
                }
              />
              <BriefItem
                label="Up next"
                value={
                  calendar.error
                    ? "Calendar data is unavailable. Check Settings."
                    : nextMeeting
                      ? `${nextMeeting.title}${nextMeeting.allDay ? " - All day" : ` - ${formatMeetingTime(nextMeeting.start)}`}`
                      : "Your next seven days are clear."
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  description: string;
  value: number | undefined;
  loading: boolean;
  error: string | undefined;
  icon: LucideIcon;
};

function MetricCard({
  title,
  description,
  value,
  loading,
  error,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card className="rounded-none ring-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <span className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon className="size-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-11 w-24" />
        ) : error ? (
          <p className="text-muted-foreground text-sm">Unavailable</p>
        ) : (
          <p className="text-4xl font-semibold tracking-tight">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

function BriefItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-2 text-sm leading-relaxed">{value}</p>
    </div>
  );
}
