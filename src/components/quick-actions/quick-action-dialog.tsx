"use client";

import { AgentChat } from "@/components/agent/agent-chat";
import { CalendarPlus, Ghost2, MailPlus } from "@/components/icons";

import { CreateEventForm } from "@/components/quick-actions/create-event-form";
import { SendEmailForm } from "@/components/quick-actions/send-email-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

const actionModes = [
  {
    value: "email" as const,
    label: "Send email",
    description: "Compose with Gmail",
    icon: MailPlus,
  },
  {
    value: "event" as const,
    label: "Create event",
    description: "Invite with Calendar",
    icon: CalendarPlus,
  },
  {
    value: "agent" as const,
    label: "Ask agent",
    description: "Use Gmail and Calendar",
    icon: Ghost2,
  },
];

export function QuickActionDialog() {
  const open = useWorkspaceStore((state) => state.commandPaletteOpen);
  const setOpen = useWorkspaceStore((state) => state.setCommandPaletteOpen);
  const mode = useWorkspaceStore((state) => state.quickActionMode);
  const setMode = useWorkspaceStore((state) => state.setQuickActionMode);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className={cn(
          "w-full max-w-full sm:max-w-full md:max-w-full gap-0 p-0",
          mode === "agent" ? "lg:max-w-4xl!" : "lg:max-w-xl!",
        )}
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base font-semibold">
            {mode === "agent" ? "Agent quick action" : "Quick action"}
          </SheetTitle>
          <SheetDescription>
            {mode === "agent"
              ? "Ask Corsair to work with Gmail and Google Calendar from this drawer."
              : "Send an email or schedule a meeting without leaving your workspace."}
          </SheetDescription>
        </SheetHeader>

        <div
          role="tablist"
          aria-label="Quick action type"
          className="bg-muted mx-4 mt-4 grid grid-cols-3 gap-1 rounded-xl p-1 sm:mx-6"
        >
          {actionModes.map((action) => {
            const Icon = action.icon;
            const active = mode === action.value;

            return (
              <button
                key={action.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setMode(action.value)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {action.label}
                  </span>
                  <span className="hidden truncate text-xs sm:block">
                    {action.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          aria-label={
            mode === "email"
              ? "Send email"
              : mode === "event"
                ? "Create event"
                : "Ask agent"
          }
          className={cn(
            "min-h-0 flex-1",
            mode === "agent" ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-6",
          )}
        >
          {mode === "email" ? (
            <SendEmailForm />
          ) : mode === "event" ? (
            <CreateEventForm />
          ) : (
            <AgentChat variant="panel" />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
