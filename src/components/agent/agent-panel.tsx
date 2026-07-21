"use client";

import { Bot } from "@/components/icons";

import { AgentChat } from "@/components/agent/agent-chat";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

export function AgentPanel() {
  const open = useWorkspaceStore((state) => state.agentPanelOpen);
  const setOpen = useWorkspaceStore((state) => state.setAgentPanelOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-xl!">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <span className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
              <Bot className="size-4" />
            </span>
            Corsair agent
          </SheetTitle>
          <SheetDescription>
            Search mail, prepare an email, or schedule a meeting. Actions that
            write data require confirmation.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <AgentChat embedded />
        </div>
      </SheetContent>
    </Sheet>
  );
}
