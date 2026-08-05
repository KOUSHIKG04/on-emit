"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Plus,
  Video,
} from "@/components/icons";

import { EventActions } from "@/components/calendar/event-actions";
import { ConnectServicePrompt } from "@/components/integrations/connect-service-prompt";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import type { CalendarView } from "@/stores/workspace-store";
import { api, type RouterOutputs } from "@/trpc/client";

type CalendarEvent = RouterOutputs["calendar"]["range"][number];

const weekDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
});
const monthTitleFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function getViewRange(date: Date, view: CalendarView) {
  if (view === "day") {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return { start, end: addDays(start, 1) };
  }

  if (view === "week") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 7) };
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  return { start: gridStart, end: addDays(gridStart, 42) };
}

function eventDateKey(event: CalendarEvent) {
  if (event.allDay) return event.start.slice(0, 10);
  return toDateKey(new Date(event.start));
}

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return "All day";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.start));
}

function getToolbarTitle(date: Date, view: CalendarView) {
  if (view === "month") return monthTitleFormatter.format(date);

  if (view === "day") {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  const start = startOfWeek(date);
  const end = addDays(start, 6);
  const startLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

export function CalendarWorkspace() {
  const calendarDate = useWorkspaceStore((state) => state.calendarDate);
  const calendarView = useWorkspaceStore((state) => state.calendarView);
  const calendarVisible = useWorkspaceStore(
    (state) => state.primaryCalendarVisible,
  );
  const setCalendarDate = useWorkspaceStore((state) => state.setCalendarDate);
  const setCalendarView = useWorkspaceStore((state) => state.setCalendarView);
  const setCommandPaletteOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );
  const setQuickActionMode = useWorkspaceStore(
    (state) => state.setQuickActionMode,
  );

  const connectionStatus = api.integrations.status.useQuery(undefined, {
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
  const calendarConnected =
    connectionStatus.data?.googleCalendar === "connected";
  const calendarConnectionKnown = connectionStatus.data !== undefined;
  const calendarQueryEnabled = calendarConnected || connectionStatus.isError;

  const selectedDate = fromDateKey(calendarDate);
  const range = getViewRange(selectedDate, calendarView);
  const eventsQuery = api.calendar.range.useQuery(
    {
      timeMin: range.start.toISOString(),
      timeMax: range.end.toISOString(),
    },
    {
      enabled: calendarQueryEnabled,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  );
  const calendarDisconnected =
    (calendarConnectionKnown && !calendarConnected) ||
    eventsQuery.error?.data?.code === "PRECONDITION_FAILED";
  const events = calendarVisible ? (eventsQuery.data ?? []) : [];

  function navigate(direction: -1 | 1) {
    const next = new Date(selectedDate);

    if (calendarView === "month") {
      next.setMonth(next.getMonth() + direction);
    } else if (calendarView === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setDate(next.getDate() + direction);
    }

    setCalendarDate(toDateKey(next));
  }

  return (
    <section className="bg-background flex min-h-full min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setCalendarDate(toDateKey(new Date()))}
        >
          Today
        </Button>
        <div className="flex items-center">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Previous calendar period"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Next calendar period"
            onClick={() => navigate(1)}
          >
            <ChevronRight />
          </Button>
        </div>

        <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {getToolbarTitle(selectedDate, calendarView)}
        </h2>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" />}
          >
            {calendarView[0]?.toUpperCase()}
            {calendarView.slice(1)}
            <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            {(["day", "month", "week"] as const).map((view) => (
              <DropdownMenuItem
                key={view}
                onClick={() => setCalendarView(view)}
              >
                {view[0]?.toUpperCase()}
                {view.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          disabled={calendarDisconnected}
          onClick={() => {
            setQuickActionMode("event");
            setCommandPaletteOpen(true);
          }}
        >
          <Plus />
          <span className="hidden sm:inline">Create event</span>
        </Button>
      </div>

      {connectionStatus.isLoading ||
      (eventsQuery.isLoading && !calendarDisconnected) ? (
        <CalendarLoading />
      ) : null}
      {calendarDisconnected ? (
        <ConnectServicePrompt
          plugin="googlecalendar"
          accountId={connectionStatus.data?.activeAccountId}
          className="min-h-96"
        />
      ) : null}
      {eventsQuery.error && !calendarDisconnected ? (
        <CalendarMessage
          title="Calendar could not be loaded"
          description={eventsQuery.error.message}
        />
      ) : null}
      {!connectionStatus.isLoading &&
      !eventsQuery.isLoading &&
      !eventsQuery.error &&
      !calendarDisconnected &&
      !calendarVisible ? (
        <CalendarMessage
          title="Primary calendar is hidden"
          description="Enable it from My calendars in the sidebar."
        />
      ) : null}

      {!connectionStatus.isLoading &&
      !eventsQuery.isLoading &&
      !eventsQuery.error &&
      !calendarDisconnected &&
      calendarVisible ? (
        calendarView === "month" ? (
          <MonthGrid
            selectedDate={selectedDate}
            rangeStart={range.start}
            events={events}
            onSelectDate={(date) => setCalendarDate(toDateKey(date))}
            onOpenDay={(date) => {
              setCalendarDate(toDateKey(date));
              setCalendarView("day");
            }}
          />
        ) : (
          <TimeGrid
            selectedDate={selectedDate}
            view={calendarView}
            events={events}
          />
        )
      ) : null}
    </section>
  );
}

function MonthGrid({
  selectedDate,
  rangeStart,
  events,
  onSelectDate,
  onOpenDay,
}: {
  selectedDate: Date;
  rangeStart: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onOpenDay: (date: Date) => void;
}) {
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(rangeStart, index),
  );
  const todayKey = toDateKey(new Date());

  return (
    <div className="bg-border grid min-h-[760px] flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(110px,1fr))] gap-px overflow-auto">
      {Array.from({ length: 7 }, (_, index) => addDays(rangeStart, index)).map(
        (date) => (
          <div
            key={date.getDay()}
            className="bg-background text-muted-foreground px-3 py-2 text-center text-xs font-semibold tracking-wide uppercase"
          >
            {weekDayFormatter.format(date)}
          </div>
        ),
      )}

      {days.map((date) => {
        const dateKey = toDateKey(date);
        const dayEvents = events.filter(
          (event) => eventDateKey(event) === dateKey,
        );
        const outside = date.getMonth() !== selectedDate.getMonth();
        const selected = dateKey === toDateKey(selectedDate);

        return (
          <div
            key={dateKey}
            className={cn(
              "bg-background group/day-cell min-w-0 overflow-hidden p-2",
              outside && "bg-muted/15 text-muted-foreground",
              selected && "bg-primary/5",
            )}
            onDoubleClick={() => onOpenDay(date)}
          >
            <button
              type="button"
              className={cn(
                "ml-auto flex size-7 items-center justify-center rounded-full text-xs font-medium",
                dateKey === todayKey &&
                  "bg-primary text-primary-foreground font-semibold",
                selected && dateKey !== todayKey && "ring-primary ring-1",
              )}
              onClick={() => onSelectDate(date)}
            >
              {date.getDate()}
            </button>

            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className="bg-primary/15 text-foreground group/event flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px]"
                >
                  <span className="bg-primary size-1.5 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1 truncate">
                    {!event.allDay ? `${formatEventTime(event)} ` : ""}
                    {event.title}
                  </span>
                  <span className="opacity-0 group-hover/event:opacity-100">
                    <EventActions event={event} compact />
                  </span>
                </div>
              ))}
              {dayEvents.length > 3 ? (
                <button
                  type="button"
                  className="text-muted-foreground px-1 text-[11px] hover:underline"
                  onClick={() => onOpenDay(date)}
                >
                  +{dayEvents.length - 3} more
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimeGrid({
  selectedDate,
  view,
  events,
}: {
  selectedDate: Date;
  view: "week" | "day";
  events: CalendarEvent[];
}) {
  const start = view === "week" ? startOfWeek(selectedDate) : selectedDate;
  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
    addDays(start, index),
  );
  const hourHeight = 56;
  const allDayEvents = events.filter((event) => event.allDay);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div
        className="bg-border grid min-w-[760px] gap-px"
        style={{
          gridTemplateColumns: `64px repeat(${days.length}, minmax(120px, 1fr))`,
        }}
      >
        <div className="bg-background sticky top-0 z-20" />
        {days.map((date) => (
          <div
            key={toDateKey(date)}
            className="bg-background sticky top-0 z-20 border-b px-2 py-3 text-center"
          >
            <p className="text-muted-foreground text-xs uppercase">
              {weekDayFormatter.format(date)}
            </p>
            <p className="mt-1 text-lg font-semibold">{date.getDate()}</p>
          </div>
        ))}

        <div className="bg-background text-muted-foreground px-2 py-3 text-right text-[10px]">
          All day
        </div>
        {days.map((date) => (
          <div key={toDateKey(date)} className="bg-background min-h-12 p-1">
            {allDayEvents
              .filter((event) => eventDateKey(event) === toDateKey(date))
              .map((event) => (
                <TimelineEvent key={event.id} event={event} compact />
              ))}
          </div>
        ))}

        <div
          className="bg-background relative"
          style={{ height: hourHeight * 24 }}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <span
              key={hour}
              className="text-muted-foreground absolute right-2 -translate-y-1/2 text-[10px]"
              style={{ top: hour * hourHeight }}
            >
              {hour === 0
                ? "12 AM"
                : hour < 12
                  ? `${hour} AM`
                  : hour === 12
                    ? "12 PM"
                    : `${hour - 12} PM`}
            </span>
          ))}
        </div>

        {days.map((date) => {
          const dateKey = toDateKey(date);
          const dayEvents = events.filter(
            (event) => !event.allDay && eventDateKey(event) === dateKey,
          );

          return (
            <div
              key={dateKey}
              className="bg-background relative"
              style={{
                height: hourHeight * 24,
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent 55px, var(--border) 55px, var(--border) 56px)",
              }}
            >
              {dayEvents.map((event) => {
                const startsAt = new Date(event.start);
                const endsAt = event.end
                  ? new Date(event.end)
                  : new Date(startsAt.getTime() + 30 * 60_000);
                const startMinutes =
                  startsAt.getHours() * 60 + startsAt.getMinutes();
                const durationMinutes = Math.max(
                  30,
                  (endsAt.getTime() - startsAt.getTime()) / 60_000,
                );

                return (
                  <div
                    key={event.id}
                    className="absolute inset-x-1 z-10"
                    style={{
                      top: (startMinutes / 60) * hourHeight,
                      height: Math.max(30, (durationMinutes / 60) * hourHeight),
                    }}
                  >
                    <TimelineEvent event={event} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineEvent({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  return (
    <article className="bg-primary/15 border-primary/40 flex h-full min-w-0 gap-2 overflow-hidden rounded-md border-l-2 p-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{event.title}</p>
        {!compact ? (
          <p className="text-muted-foreground mt-0.5 truncate">
            {formatEventTime(event)}
            {event.location ? ` - ${event.location}` : ""}
          </p>
        ) : null}
        {!compact && event.meetingUrl ? (
          <a
            href={event.meetingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary mt-1 inline-flex items-center gap-1"
          >
            <Video className="size-3" /> Join
          </a>
        ) : null}
        {!compact && event.location && !event.meetingUrl ? (
          <span className="text-muted-foreground mt-1 flex items-center gap-1 truncate">
            <MapPin className="size-3" /> {event.location}
          </span>
        ) : null}
      </div>
      <EventActions event={event} />
    </article>
  );
}

function CalendarLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-background flex min-h-96 flex-1 flex-col items-center justify-center gap-3"
    >
      <LoaderCircle className="text-primary size-7 animate-spin" />
      <p className="text-muted-foreground text-sm">Loading calendar...</p>
    </div>
  );
}

function CalendarMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-96 flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-full">
        <CalendarDays className="text-muted-foreground size-5" />
      </div>
      <p className="mt-4 font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
    </div>
  );
}
