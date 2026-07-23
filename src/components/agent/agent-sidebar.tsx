"use client";

import {
  MessageCircle,
  MoreHorizontal,
  Plus,
  Trash2,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";

function formatUpdatedAt(timestamp: number) {
  const date = new Date(timestamp);
  const isToday = date.toDateString() === new Date().toDateString();

  return new Intl.DateTimeFormat(undefined, {
    ...(isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

export function AgentSidebar() {
  const conversations = useWorkspaceStore(
    (state) => state.agentConversationSummaries,
  );
  const activeId = useWorkspaceStore(
    (state) => state.activeAgentConversationId,
  );
  const selectConversation = useWorkspaceStore(
    (state) => state.setActiveAgentConversationId,
  );
  const requestNewChat = useWorkspaceStore(
    (state) => state.requestNewAgentChat,
  );
  const requestDeleteChat = useWorkspaceStore(
    (state) => state.requestDeleteAgentChat,
  );

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center border-b px-3">
        <Button
          type="button"
          className="w-full"
          onClick={() => requestNewChat()}
        >
          <Plus />
          New chat
        </Button>
      </div>

      <div className="mt-3 flex h-8 shrink-0 items-center gap-3 px-4">
        {/* <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <MessageCircle className="size-4" />
        </div> */}
        <div className="min-w-0 flex-1">
          {/* <h2 className="truncate text-sm font-semibold">Recent chats</h2> */}
          <p className="text-muted-foreground truncate text-xs">
            Saved conversations
          </p>
        </div>
        {/* {conversations.length > 0 ? (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {conversations.length}
          </span>
        ) : null} */}
      </div>

      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="Recent agent chats"
      >
        {conversations.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-xs">
            Start a new chat to begin.
          </p>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group/chat hover:bg-sidebar-accent flex min-w-0 items-center rounded-md transition-colors",
                activeId === conversation.id &&
                  "bg-sidebar-accent text-sidebar-accent-foreground",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
                aria-current={activeId === conversation.id ? "page" : undefined}
                onClick={() => selectConversation(conversation.id)}
              >
                <MessageCircle className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {conversation.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {formatUpdatedAt(conversation.updatedAt)}
                  </span>
                </span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="mr-1 shrink-0 opacity-100 focus-visible:opacity-100 data-open:opacity-100 md:opacity-0 md:group-hover/chat:opacity-100"
                      aria-label={`Options for ${conversation.title}`}
                    />
                  }
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-36">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => requestDeleteChat(conversation.id)}
                  >
                    <Trash2 />
                    Delete chat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}
