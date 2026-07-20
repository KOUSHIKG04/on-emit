"use client";

import { CalendarPlus, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function CalendarSidebar({ accountEmail }: { accountEmail: string }) {
  const calendarDate = useWorkspaceStore((state) => state.calendarDate);
  const setCalendarDate = useWorkspaceStore((state) => state.setCalendarDate);
  const primaryVisible = useWorkspaceStore(
    (state) => state.primaryCalendarVisible,
  );
  const setPrimaryVisible = useWorkspaceStore(
    (state) => state.setPrimaryCalendarVisible,
  );
  const setCommandPaletteOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );
  const selectedDate = fromDateKey(calendarDate);

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b p-3">
        <Button
          type="button"
          className="w-full"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <CalendarPlus />
          Create event
        </Button>
      </div>

      <div className="border-b py-3">
        <Calendar
          mode="single"
          month={selectedDate}
          selected={selectedDate}
          className="w-full bg-transparent px-3"
          classNames={{
            root: "w-full",
            month: "w-full flex flex-col gap-3",
            month_grid: "w-full border-collapse",
          }}
          onMonthChange={(month) => setCalendarDate(toDateKey(month))}
          onSelect={(date) => {
            if (date) setCalendarDate(toDateKey(date));
          }}
        />
      </div>

      <Collapsible defaultOpen className="border-b">
        <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold">
          My calendars
          <ChevronRight className="text-muted-foreground size-4 transition-transform group-data-panel-open:rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <label className="hover:bg-sidebar-accent flex cursor-pointer items-center gap-3 px-5 py-3 text-sm transition-colors">
            <Checkbox
              checked={primaryVisible}
              onCheckedChange={setPrimaryVisible}
            />
            <span className="bg-primary size-2.5 rounded-full" />
            <span className="min-w-0 flex-1 truncate">{accountEmail}</span>
          </label>
        </CollapsibleContent>
      </Collapsible>

      <EmptyCalendarGroup title="Favorites" />
      <EmptyCalendarGroup title="Other" />

      <div className="text-muted-foreground mt-auto border-t p-4 text-xs leading-relaxed">
        Corsair currently provides events from your primary Google Calendar.
      </div>
    </div>
  );
}

function EmptyCalendarGroup({ title }: { title: string }) {
  return (
    <Collapsible className="border-b">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold">
        {title}
        <ChevronRight className="text-muted-foreground size-4 transition-transform group-data-panel-open:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p className="text-muted-foreground px-5 pb-4 text-xs">
          No calendars in this group.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
