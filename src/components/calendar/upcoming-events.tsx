"use client";

import { AlertCircle, CalendarDays, MapPin, Video } from "@/components/icons";

import { EventActions } from "@/components/calendar/event-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type RouterOutputs } from "@/trpc/client";
import { ClientDateTime } from "@/components/shared/client-date-time";

type CalendarEvent = RouterOutputs["calendar"]["upcoming"][number];

type EventGroup = {
  title: string;
  events: CalendarEvent[];
};

function parseEventDate(event: CalendarEvent) {
  if (event.allDay) {
    return new Date(`${event.start}T00:00:00`);
  }

  return new Date(event.start);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function groupEvents(events: CalendarEvent[]): EventGroup[] {
  const today = startOfDay(new Date());

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const afterTomorrow = new Date(tomorrow);
  afterTomorrow.setDate(afterTomorrow.getDate() + 1);

  return [
    {
      title: "Today",
      events: events.filter((event) => {
        const eventDate = startOfDay(parseEventDate(event));
        return eventDate.getTime() === today.getTime();
      }),
    },
    {
      title: "Tomorrow",
      events: events.filter((event) => {
        const eventDate = startOfDay(parseEventDate(event));
        return eventDate.getTime() === tomorrow.getTime();
      }),
    },
    {
      title: "Later this week",
      events: events.filter((event) => {
        const eventDate = startOfDay(parseEventDate(event));
        return eventDate.getTime() >= afterTomorrow.getTime();
      }),
    },
  ];
}

export function UpcomingEvents() {
  const {
    data: events,
    error,
    isLoading,
  } = api.calendar.upcoming.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const calendarDisconnected = error?.data?.code === "PRECONDITION_FAILED";

  const groups = groupEvents(events ?? []);

  return (
    <Card className="min-h-[550px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="size-5" />
          Upcoming
        </CardTitle>

        <CardDescription>
          Your schedule for the next seven days.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? <CalendarSkeleton /> : null}

        {calendarDisconnected ? (
          <EmptyState
            title="Calendar is not connected"
            description="Connect Google Calendar to your Corsair tenant."
          />
        ) : null}

        {error && !calendarDisconnected ? (
          <EmptyState
            title="Calendar could not be loaded"
            description={error.message}
          />
        ) : null}

        {!isLoading && !error && events?.length === 0 ? (
          <EmptyState
            title="Your schedule is clear"
            description="No events are scheduled during the next seven days."
          />
        ) : null}

        {!isLoading && !error && events && events.length > 0 ? (
          <div className="space-y-6">
            {groups.map((group) =>
              group.events.length > 0 ? (
                <section key={group.title}>
                  <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                    {group.title}
                  </h3>

                  <div className="space-y-2">
                    {group.events.map((event) => (
                      <EventRow key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ) : null,
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  return (
    <article className="border-border rounded-lg border p-3">
      <div className="flex items-start gap-3">
        <div className="bg-primary mt-1 h-10 w-1 rounded-full" />

        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            {event.allDay ? (
              "All day"
            ) : (
              <>
                <ClientDateTime value={event.start} format="event" />
                {event.end ? (
                  <>
                    {" - "}
                    <ClientDateTime value={event.end} format="event" />
                  </>
                ) : null}
              </>
            )}
          </p>

          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="min-w-0 font-medium">{event.title}</p>
            <EventActions event={event} />
          </div>

          {event.location ? (
            <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
              <MapPin className="size-3" />
              {event.location}
            </p>
          ) : null}

          {event.attendees.length > 0 ? (
            <p className="text-muted-foreground mt-2 text-xs">
              {event.attendees.length} attendee
              {event.attendees.length === 1 ? "" : "s"}
            </p>
          ) : null}

          {event.meetingUrl ? (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium hover:underline"
            >
              <Video className="size-3" />
              Join meeting
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-20" />

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
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
