"use client";

import { useEffect } from "react";
import { CalendarPlus, Command, MailPlus, Sparkles } from "lucide-react";

import { CreateEventForm } from "@/components/quick-actions/create-event-form";
import { SendEmailForm } from "@/components/quick-actions/send-email-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
];

export function QuickActionDialog() {
  const open = useWorkspaceStore((state) => state.commandPaletteOpen);
  const setOpen = useWorkspaceStore((state) => state.setCommandPaletteOpen);
  const mode = useWorkspaceStore((state) => state.quickActionMode);
  const setMode = useWorkspaceStore((state) => state.setQuickActionMode);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [setOpen]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Sparkles />
        <span className="hidden sm:inline">Quick action</span>
        <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center gap-0.5 rounded border px-1.5 font-mono text-[10px] font-medium md:inline-flex">
          <Command className="size-3" />K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick action</DialogTitle>
            <DialogDescription>
              Send an email or schedule a meeting without leaving your
              workspace.
            </DialogDescription>
          </DialogHeader>

          <div
            role="tablist"
            aria-label="Quick action type"
            className="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1"
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
            aria-label={mode === "email" ? "Send email" : "Create event"}
            className="pt-1"
          >
            {mode === "email" ? <SendEmailForm /> : <CreateEventForm />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
