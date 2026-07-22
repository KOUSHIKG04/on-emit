"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { TablerIcon } from "@/components/icons";
import {
  Ghost2,
  CalendarDays,
  CalendarPlus,
  Command,
  FocusCentered,
  Inbox,
  MailPlus,
  Search,
  Settings,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

type CommandGroup = "Navigate" | "Actions";

type WorkspaceCommand = {
  id: string;
  group: CommandGroup;
  label: string;
  keywords: string;
  icon: TablerIcon;
  hint?: string;
  run: () => void;
};

export function WorkspaceCommandMenu({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setQuickActionOpen = useWorkspaceStore(
    (state) => state.setCommandPaletteOpen,
  );
  const setQuickActionMode = useWorkspaceStore(
    (state) => state.setQuickActionMode,
  );

  const commands = useMemo<WorkspaceCommand[]>(() => {
    function navigate(href: string) {
      setOpen(false);
      router.push(href);
    }

    function quickAction(mode: "email" | "event") {
      setOpen(false);
      setQuickActionMode(mode);
      setQuickActionOpen(true);
    }

    return [
      {
        id: "focus",
        group: "Navigate",
        label: "Open Focus",
        keywords: "dashboard daily brief home",
        icon: FocusCentered,
        run: () => navigate("/focus"),
      },
      {
        id: "inbox",
        group: "Navigate",
        label: "Go to Inbox",
        keywords: "gmail email mail",
        icon: Inbox,
        run: () => navigate("/inbox"),
      },
      {
        id: "calendar",
        group: "Navigate",
        label: "Go to Calendar",
        keywords: "events schedule meetings",
        icon: CalendarDays,
        run: () => navigate("/calendar"),
      },
      {
        id: "agent",
        group: "Navigate",
        label: "Open Agent",
        keywords: "assistant gemini chat corsair",
        icon: Ghost2,
        run: () => navigate("/agent"),
      },
      {
        id: "search",
        group: "Navigate",
        label: "Advanced Search",
        keywords: "find gmail operators email",
        icon: Search,
        hint: "/",
        run: () => navigate("/search"),
      },
      {
        id: "settings",
        group: "Navigate",
        label: "Open Settings",
        keywords: "connections api key byok integrations",
        icon: Settings,
        run: () => navigate("/settings"),
      },
      {
        id: "send-email",
        group: "Actions",
        label: "Send email",
        keywords: "compose gmail message",
        icon: MailPlus,
        run: () => quickAction("email"),
      },
      {
        id: "create-event",
        group: "Actions",
        label: "Create event",
        keywords: "calendar invite schedule meeting",
        icon: CalendarPlus,
        run: () => quickAction("event"),
      },
    ];
  }, [router, setQuickActionMode, setQuickActionOpen]);

  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;

    return commands.filter((item) =>
      `${item.label} ${item.keywords}`.toLowerCase().includes(normalizedQuery),
    );
  }, [commands, query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (open) {
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
    }
  }, [open]);

  function runActiveCommand() {
    filteredCommands[activeIndex]?.run();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "text-muted-foreground min-w-9 justify-start gap-2 px-2 sm:min-w-24 sm:flex-1 sm:px-3 lg:max-w-xl",
          className,
        )}
        aria-label="Search commands"
        onClick={() => setOpen(true)}
      >
        <Search className="shrink-0" />
        <span className="hidden flex-1 truncate text-left font-normal sm:block">
          Search commands...
        </span>
        <kbd className="bg-muted pointer-events-none hidden items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium lg:inline-flex">
          <Command className="size-3" />K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[10vh] max-h-[80vh] max-w-2xl translate-y-0 gap-0 overflow-hidden rounded-xl p-0"
        >
          <DialogTitle className="sr-only">Search commands</DialogTitle>
          <DialogDescription className="sr-only">
            Search workspace navigation and actions.
          </DialogDescription>

          <div className="flex h-16 items-center gap-3 border-b px-4">
            <Search className="text-muted-foreground size-5 shrink-0" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="workspace-command-list"
              aria-activedescendant={
                filteredCommands[activeIndex]
                  ? `workspace-command-${filteredCommands[activeIndex].id}`
                  : undefined
              }
              value={query}
              className="placeholder:text-muted-foreground h-full min-w-0 flex-1 bg-transparent text-base outline-none"
              placeholder="Search commands..."
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    filteredCommands.length
                      ? (current + 1) % filteredCommands.length
                      : 0,
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((current) =>
                    filteredCommands.length
                      ? (current - 1 + filteredCommands.length) %
                        filteredCommands.length
                      : 0,
                  );
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  runActiveCommand();
                }
              }}
            />
            <button
              type="button"
              className="text-muted-foreground rounded border px-1.5 py-0.5 font-mono text-[10px]"
              onClick={() => setOpen(false)}
            >
              esc
            </button>
          </div>

          <div
            id="workspace-command-list"
            role="listbox"
            className="min-h-44 overflow-y-auto p-2"
          >
            {filteredCommands.length ? (
              filteredCommands.map((item, index) => {
                const Icon = item.icon;
                const previousGroup = filteredCommands[index - 1]?.group;
                const showGroup = index === 0 || item.group !== previousGroup;

                return (
                  <Fragment key={item.id}>
                    {showGroup ? (
                      <p className="text-muted-foreground px-3 pt-3 pb-1.5 text-xs font-medium">
                        {item.group}
                      </p>
                    ) : null}
                    <button
                      id={`workspace-command-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className={cn(
                        "flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                        index === activeIndex
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={item.run}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.label}
                      </span>
                      {item.hint ? (
                        <span className="text-muted-foreground text-xs">
                          {item.hint}
                        </span>
                      ) : null}
                    </button>
                  </Fragment>
                );
              })
            ) : (
              <div className="text-muted-foreground flex min-h-40 items-center justify-center text-sm">
                No matching commands
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
