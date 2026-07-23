"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Ghost2,
  Clock3,
  LoaderCircle,
  Paperclip,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "@/components/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { getAiModelLabel, getAiProviderLabel } from "@/lib/ai-providers";
import type { AgentConversationContext } from "@/stores/workspace-store";

type Values = { message: string };

type AgentAttachment = {
  id: string;
  name: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  size: number;
  dataUrl: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AgentAttachment[];
  actionId?: string;
};

type QueuedAction = {
  id: string;
  request: string;
  summary: string;
  attachments: AgentAttachment[];
  status: "pending" | "running" | "completed";
  createdAt: number;
};

type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  actions: QueuedAction[];
  context?: AgentConversationContext;
};

const STORAGE_KEY = "on-emit.agent-conversations";
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 2_500_000;
const MAX_TOTAL_ATTACHMENT_BYTES = 3_000_000;
const ACCEPTED_IMAGE_TYPES = new Set<AgentAttachment["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXAMPLE_PROMPTS = [
  {
    label: "Summarize my unread mail",
    prompt: "Summarize my unread mail and highlight anything urgent.",
    icon: Sparkles,
  },
  {
    label: "What's on my calendar this week?",
    prompt: "What is on my calendar this week?",
    icon: CalendarDays,
  },
  {
    label: "Find and archive an email",
    prompt: "Find the latest email from Google and archive it.",
    icon: Search,
  },
  {
    label: "Schedule a 30 minute meeting",
    prompt: "Schedule a 30 minute meeting tomorrow at 9 AM.",
    icon: Clock3,
  },
] as const;

function createId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function createConversation(context?: AgentConversationContext): Conversation {
  return {
    id: createId(),
    title: context?.subject ?? "New conversation",
    updatedAt: Date.now(),
    messages: [],
    actions: [],
    ...(context ? { context } : {}),
  };
}

function isAttachment(value: unknown): value is AgentAttachment {
  if (!value || typeof value !== "object") return false;
  const attachment = value as Partial<AgentAttachment>;

  return (
    typeof attachment.id === "string" &&
    typeof attachment.name === "string" &&
    typeof attachment.mimeType === "string" &&
    ACCEPTED_IMAGE_TYPES.has(attachment.mimeType) &&
    typeof attachment.size === "number" &&
    typeof attachment.dataUrl === "string"
  );
}

function isQueuedAction(value: unknown): value is QueuedAction {
  if (!value || typeof value !== "object") return false;
  const action = value as Partial<QueuedAction>;

  return (
    typeof action.id === "string" &&
    typeof action.request === "string" &&
    typeof action.summary === "string" &&
    typeof action.createdAt === "number" &&
    (action.status === "pending" ||
      action.status === "running" ||
      action.status === "completed") &&
    Array.isArray(action.attachments) &&
    action.attachments.every(isAttachment)
  );
}

type StoredConversation = Omit<Conversation, "actions"> & {
  actions?: unknown;
  pendingConfirmation?: unknown;
};

function isConversation(value: unknown): value is StoredConversation {
  if (!value || typeof value !== "object") return false;

  const conversation = value as Partial<Conversation>;
  const validContext =
    conversation.context == null ||
    (conversation.context.type === "gmail-thread" &&
      typeof conversation.context.threadId === "string" &&
      typeof conversation.context.subject === "string" &&
      (conversation.context.senderEmail === null ||
        typeof conversation.context.senderEmail === "string"));

  return (
    validContext &&
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    typeof conversation.updatedAt === "number" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(
      (message) =>
        Boolean(message) &&
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        (message.actionId == null || typeof message.actionId === "string") &&
        (message.attachments == null ||
          (Array.isArray(message.attachments) &&
            message.attachments.every(isAttachment))),
    )
  );
}

function fileToAttachment(file: File) {
  return new Promise<AgentAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }

      resolve({
        id: createId(),
        name: file.name,
        mimeType: file.type as AgentAttachment["mimeType"],
        size: file.size,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  });
}

function conversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim();
  return normalized.length > 42
    ? `${normalized.slice(0, 42).trimEnd()}...`
    : normalized;
}

function formatUpdatedAt(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  return new Intl.DateTimeFormat(undefined, {
    ...(isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }),
  }).format(date);
}

type ActionsPanelProps = {
  actions: QueuedAction[];
  disabled: boolean;
  onApprove: (action: QueuedAction) => void;
  onRemove: (actionId: string) => void;
};

function ActionsPanel({
  actions,
  disabled,
  onApprove,
  onRemove,
}: ActionsPanelProps) {
  const pendingCount = actions.filter(
    (action) => action.status !== "completed",
  ).length;

  return (
    <div className="bg-background flex size-full min-h-0 flex-col">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <CheckCircle2 className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">Actions</h2>
          <p className="text-muted-foreground truncate text-xs">
            Review queued work
          </p>
        </div>
        {pendingCount > 0 ? (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
            {pendingCount}
          </span>
        ) : null}
      </div>

      {actions.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">No actions waiting</p>
            <p className="text-muted-foreground mt-1 text-xs leading-5">
              Email and calendar changes appear here for approval.
            </p>
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {[...actions].reverse().map((action) => (
            <article key={action.id} className="border-b p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                    action.status === "completed"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {action.status === "completed" ? (
                    <CheckCircle2 className="size-4" />
                  ) : action.status === "running" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Clock3 className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {action.request || "Attached image request"}
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-3 text-xs leading-5">
                    {action.summary}
                  </p>
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    {formatUpdatedAt(action.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Remove action"
                  aria-label="Remove action"
                  disabled={action.status === "running"}
                  onClick={() => onRemove(action.id)}
                >
                  <Trash2 />
                </Button>
                {action.status !== "completed" ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={disabled || action.status === "running"}
                    onClick={() => onApprove(action)}
                  >
                    {action.status === "running" ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <ShieldCheck />
                    )}
                    {action.status === "running" ? "Running" : "Approve & run"}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function AgentChat({
  variant = "page",
}: {
  variant?: "page" | "panel";
} = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [pendingConversationId, setPendingConversationId] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, setValue } = useForm<Values>();
  const agentDraft = useWorkspaceStore((state) => state.agentDraft);
  const setAgentDraft = useWorkspaceStore((state) => state.setAgentDraft);
  const activeId = useWorkspaceStore(
    (state) => state.activeAgentConversationId,
  );
  const setActiveId = useWorkspaceStore(
    (state) => state.setActiveAgentConversationId,
  );
  const setConversationSummaries = useWorkspaceStore(
    (state) => state.setAgentConversationSummaries,
  );
  const agentChatCommand = useWorkspaceStore((state) => state.agentChatCommand);
  const clearAgentChatCommand = useWorkspaceStore(
    (state) => state.clearAgentChatCommand,
  );
  const chat = api.agent.chat.useMutation();
  const settingsQuery = api.aiSettings.get.useQuery(undefined, {
    staleTime: 60_000,
  });

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  );
  const greeting = hydrated
    ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}`
    : "Welcome";

  useEffect(() => {
    let storedConversations: Conversation[] = [];

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        storedConversations = parsed.filter(isConversation).map((item) => {
          const storedActions = Array.isArray(item.actions)
            ? item.actions.filter(isQueuedAction).map((action) => ({
                ...action,
                status:
                  action.status === "running"
                    ? ("pending" as const)
                    : action.status,
              }))
            : [];
          const legacyActions =
            storedActions.length === 0 &&
            typeof item.pendingConfirmation === "string"
              ? [
                  {
                    id: createId(),
                    request: item.pendingConfirmation,
                    summary: "Review and run this saved agent action.",
                    attachments: [],
                    status: "pending" as const,
                    createdAt: item.updatedAt,
                  },
                ]
              : [];

          return {
            id: item.id,
            title: item.title,
            updatedAt: item.updatedAt,
            messages: item.messages,
            actions: [...storedActions, ...legacyActions],
          };
        });
      }
    } catch {
      storedConversations = [];
    }

    const nextConversations = storedConversations.length
      ? storedConversations
      : [createConversation()];
    const mostRecent = [...nextConversations].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )[0];

    setConversations(nextConversations);
    setActiveId(mostRecent?.id ?? null);
    setHydrated(true);
  }, [setActiveId]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setConversationSummaries(
      sortedConversations.map(({ id, title, updatedAt }) => ({
        id,
        title,
        updatedAt,
      })),
    );
  }, [hydrated, setConversationSummaries, sortedConversations]);

  useEffect(() => {
    if (!hydrated) return;
    setAttachments([]);
    setMobileActionsOpen(false);
    reset({ message: "" });
  }, [activeId, hydrated, reset]);

  useEffect(() => {
    if (!hydrated || !agentDraft) return;

    setValue("message", agentDraft, { shouldDirty: true });
    setAgentDraft("");
  }, [agentDraft, hydrated, setAgentDraft, setValue]);

  useEffect(() => {
    if (settingsQuery.error) toast.error(settingsQuery.error.message);
  }, [settingsQuery.error]);

  const createNewChat = useCallback(
    (context?: AgentConversationContext) => {
      const conversation = createConversation(context);
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversation.id);
      setMobileActionsOpen(false);
      setAttachments([]);
      reset({ message: "" });
    },
    [reset, setActiveId],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      const remaining = conversations.filter(
        (conversation) => conversation.id !== id,
      );
      const nextConversations = remaining.length
        ? remaining
        : [createConversation()];

      setConversations(nextConversations);
      if (activeId === id) {
        const nextActive = [...nextConversations].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        )[0];
        setActiveId(nextActive?.id ?? null);
        setAttachments([]);
        reset({ message: "" });
      }
      toast.success("Chat deleted.");
    },
    [activeId, conversations, reset, setActiveId],
  );

  useEffect(() => {
    if (!hydrated || !agentChatCommand) return;

    if (agentChatCommand.type === "create") {
      createNewChat(agentChatCommand.context);
    } else {
      deleteConversation(agentChatCommand.conversationId);
    }
    clearAgentChatCommand(agentChatCommand.id);
  }, [
    agentChatCommand,
    clearAgentChatCommand,
    createNewChat,
    deleteConversation,
    hydrated,
  ]);

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Attach up to ${MAX_ATTACHMENTS} images.`);
      return;
    }

    const unsupported = files.find(
      (file) =>
        !ACCEPTED_IMAGE_TYPES.has(file.type as AgentAttachment["mimeType"]),
    );
    if (unsupported) {
      toast.error("Use a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    const oversized = files.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      toast.error(`${oversized.name} is larger than 2.5 MB.`);
      return;
    }

    const totalBytes = [...attachments, ...files].reduce(
      (total, item) => total + item.size,
      0,
    );
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      toast.error("Keep the combined image size under 3 MB.");
      return;
    }

    try {
      const nextAttachments = await Promise.all(files.map(fileToAttachment));
      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not attach the image.",
      );
    }
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }

  function removeAction(conversationId: string, actionId: string) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              actions: conversation.actions.filter(
                (action) => action.id !== actionId,
              ),
            }
          : conversation,
      ),
    );
    toast.success("Action removed.");
  }

  async function runAgent(
    conversationId: string,
    message: string,
    confirmed: boolean,
    appendUserMessage: boolean,
    agentAttachments: AgentAttachment[] = [],
    actionId?: string,
  ) {
    const content = message.trim();
    if ((!content && agentAttachments.length === 0) || chat.isPending) return;
    const selectedConversation = conversations.find(
      (conversation) => conversation.id === conversationId,
    );
    if (!selectedConversation) return;

    const now = Date.now();
    const displayContent = content || "Analyze the attached image.";
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: displayContent,
      attachments: agentAttachments,
    };

    setPendingConversationId(conversationId);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title:
                appendUserMessage && conversation.messages.length === 0
                  ? conversationTitle(displayContent)
                  : conversation.title,
              updatedAt: now,
              messages: appendUserMessage
                ? [...conversation.messages, userMessage]
                : conversation.messages,
              actions: actionId
                ? conversation.actions.map((action) =>
                    action.id === actionId
                      ? { ...action, status: "running" as const }
                      : action,
                  )
                : conversation.actions,
            }
          : conversation,
      ),
    );

    if (appendUserMessage) {
      reset({ message: "" });
      setAttachments([]);
    }

    try {
      const scopedMessage =
        selectedConversation.context?.type === "gmail-thread"
          ? `This conversation is scoped to one Gmail thread. Use only Gmail thread ${selectedConversation.context.threadId} with subject "${selectedConversation.context.subject}"${
              selectedConversation.context.senderEmail
                ? ` from ${selectedConversation.context.senderEmail}`
                : ""
            } unless the user explicitly asks to leave this thread. User request: ${content}`
          : content;
      const result = await chat.mutateAsync({
        message: scopedMessage,
        attachments: agentAttachments.map((attachment) => ({
          name: attachment.name,
          mimeType: attachment.mimeType,
          dataUrl: attachment.dataUrl,
        })),
        confirmed,
      });
      const queuedActionId = result.requiresApproval ? createId() : undefined;
      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: result.reply,
        actionId: queuedActionId,
      };

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt: Date.now(),
                messages: [...conversation.messages, assistantMessage],
                actions: confirmed
                  ? conversation.actions.map((action) =>
                      action.id === actionId
                        ? { ...action, status: "completed" as const }
                        : action,
                    )
                  : result.requiresApproval && queuedActionId
                    ? [
                        ...conversation.actions,
                        {
                          id: queuedActionId,
                          request: displayContent,
                          summary: result.reply,
                          attachments: agentAttachments,
                          status: "pending" as const,
                          createdAt: Date.now(),
                        },
                      ]
                    : conversation.actions,
              }
            : conversation,
        ),
      );
      if (confirmed) toast.success("Agent action completed.");
      if (result.requiresApproval) toast.success("Action added to the queue.");
    } catch (error) {
      if (actionId) {
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  actions: conversation.actions.map((action) =>
                    action.id === actionId
                      ? { ...action, status: "pending" as const }
                      : action,
                  ),
                }
              : conversation,
          ),
        );
      }
      toast.error(
        error instanceof Error ? error.message : "The agent could not respond.",
      );
    } finally {
      setPendingConversationId(null);
    }
  }

  function submit(values: Values) {
    if (!activeConversation) return;
    if (!values.message.trim() && attachments.length === 0) {
      toast.error("Enter a request or attach an image.");
      return;
    }
    return runAgent(
      activeConversation.id,
      values.message,
      false,
      true,
      attachments,
    );
  }

  const isActiveConversationPending =
    pendingConversationId === activeConversation?.id;

  return (
    <div className="bg-background flex size-full min-h-0 overflow-hidden">
      <Sheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
        <SheetContent
          side="right"
          className="w-[min(24rem,92vw)] gap-0 p-0"
          showCloseButton={false}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Actions</SheetTitle>
            <SheetDescription>
              Review and run queued agent actions.
            </SheetDescription>
          </SheetHeader>
          <ActionsPanel
            actions={activeConversation?.actions ?? []}
            disabled={chat.isPending}
            onApprove={(action) => {
              if (!activeConversation) return;
              void runAgent(
                activeConversation.id,
                action.request,
                true,
                false,
                action.attachments,
                action.id,
              );
            }}
            onRemove={(actionId) => {
              if (!activeConversation) return;
              removeAction(activeConversation.id, actionId);
            }}
          />
        </SheetContent>
      </Sheet>

      <section className="flex min-w-0 flex-1 flex-col">
        {activeConversation?.context?.type === "gmail-thread" ? (
          <div className="bg-card flex shrink-0 items-center gap-2 border-b px-4 py-2.5 text-xs">
            <Ghost2 className="text-primary size-4 shrink-0" />
            <span className="text-muted-foreground">Working with</span>
            <span className="min-w-0 truncate font-medium">
              {activeConversation.context.subject}
            </span>
          </div>
        ) : null}
        <div className="min-h-0 flex-1">
          {activeConversation ? (
            <MessageScrollerProvider
              key={activeConversation.id}
              autoScroll
              defaultScrollPosition="last-anchor"
            >
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6"
                    aria-busy={isActiveConversationPending}
                  >
                    {activeConversation.messages.length === 0 ? (
                      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col items-center justify-center px-2 py-10 text-center">
                        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-md">
                          <Ghost2 />
                        </div>
                        <h2 className="mt-4 text-xl font-semibold">
                          {greeting}
                        </h2>
                        <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-6">
                          {activeConversation.context?.type === "gmail-thread"
                            ? "Ask about this email, draft a reply, or queue a Gmail action for approval."
                            : "Search and summarize mail, prepare actions for approval, and manage your calendar."}
                        </p>
                        <div className="mt-7 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                          {(activeConversation.context?.type === "gmail-thread"
                            ? [
                                {
                                  label: "Summarize this email",
                                  prompt:
                                    "Summarize this email and list anything I need to do.",
                                  icon: Sparkles,
                                },
                                {
                                  label: "Draft a reply",
                                  prompt:
                                    "Draft a concise reply to this email. Do not send it yet.",
                                  icon: Ghost2,
                                },
                                {
                                  label: "Archive this email",
                                  prompt:
                                    "Archive this email after showing me the exact action for approval.",
                                  icon: Search,
                                },
                                {
                                  label: "Find dates and tasks",
                                  prompt:
                                    "Extract every date, deadline, meeting, and action item from this email.",
                                  icon: CalendarDays,
                                },
                              ]
                            : EXAMPLE_PROMPTS
                          ).map((example) => {
                            const Icon = example.icon;
                            return (
                              <Button
                                key={example.label}
                                type="button"
                                variant="outline"
                                className="h-auto min-h-14 justify-start px-4 py-3 text-left whitespace-normal"
                                disabled={chat.isPending}
                                onClick={() =>
                                  void runAgent(
                                    activeConversation.id,
                                    example.prompt,
                                    false,
                                    true,
                                  )
                                }
                              >
                                <Icon className="text-muted-foreground size-4 shrink-0" />
                                <span>{example.label}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      activeConversation.messages.map((message) => {
                        const isUser = message.role === "user";
                        const queuedAction = message.actionId
                          ? activeConversation.actions.find(
                              (action) => action.id === message.actionId,
                            )
                          : undefined;

                        return (
                          <MessageScrollerItem
                            key={message.id}
                            messageId={message.id}
                            scrollAnchor={isUser}
                          >
                            <Message align={isUser ? "end" : "start"}>
                              <MessageAvatar>
                                <Avatar>
                                  <AvatarFallback
                                    className={cn(
                                      isUser
                                        ? "bg-secondary text-secondary-foreground"
                                        : "bg-primary/10 text-primary",
                                    )}
                                  >
                                    {isUser ? (
                                      <UserRound className="size-4" />
                                    ) : (
                                      <Ghost2 className="size-4" />
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                              </MessageAvatar>
                              <MessageContent>
                                <MessageHeader>
                                  {isUser ? "You" : "Corsair"}
                                </MessageHeader>
                                {message.attachments?.length ? (
                                  <div
                                    className={cn(
                                      "mb-2 flex max-w-md flex-wrap gap-2",
                                      isUser && "justify-end self-end",
                                    )}
                                  >
                                    {message.attachments.map((attachment) => (
                                      <div
                                        key={attachment.id}
                                        className="bg-muted relative size-24 overflow-hidden rounded-md border"
                                      >
                                        <Image
                                          src={attachment.dataUrl}
                                          alt={attachment.name}
                                          fill
                                          unoptimized
                                          className="object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                <Bubble
                                  variant={isUser ? "default" : "muted"}
                                  align={isUser ? "end" : "start"}
                                >
                                  <BubbleContent className="whitespace-pre-wrap">
                                    {message.content}
                                  </BubbleContent>
                                </Bubble>
                                {queuedAction ? (
                                  <MessageFooter>
                                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                                      {queuedAction.status === "completed" ? (
                                        <CheckCircle2 className="size-3.5 text-emerald-500" />
                                      ) : (
                                        <Clock3 className="size-3.5" />
                                      )}
                                      {queuedAction.status === "completed"
                                        ? "Action completed"
                                        : "Added to Actions"}
                                    </span>
                                  </MessageFooter>
                                ) : null}
                              </MessageContent>
                            </Message>
                          </MessageScrollerItem>
                        );
                      })
                    )}

                    {isActiveConversationPending ? (
                      <MessageScrollerItem
                        messageId={`pending-${activeConversation.id}`}
                      >
                        <Message>
                          <MessageAvatar>
                            <Avatar>
                              <AvatarFallback className="bg-primary/10 text-primary">
                                <Ghost2 className="size-4" />
                              </AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>Corsair</MessageHeader>
                            <Bubble variant="muted">
                              <BubbleContent className="text-muted-foreground flex items-center gap-2">
                                <LoaderCircle className="size-4 animate-spin" />
                                Working...
                              </BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      </MessageScrollerItem>
                    ) : null}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          ) : null}
        </div>

        <form
          className="bg-background shrink-0 px-3 pb-3 md:px-5 md:pb-5"
          onSubmit={handleSubmit(submit)}
        >
          <div className="bg-muted/35 focus-within:border-ring mx-auto w-full max-w-3xl rounded-2xl border p-2 shadow-sm transition-colors">
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 px-2 pt-1">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="bg-background relative flex h-16 w-28 items-center gap-2 overflow-hidden rounded-md border p-1.5 pr-7"
                  >
                    <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-sm">
                      <Image
                        src={attachment.dataUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <span className="min-w-0 truncate text-xs">
                      {attachment.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute top-1 right-1"
                      title={`Remove ${attachment.name}`}
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() => removeAttachment(attachment.id)}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <Textarea
              rows={2}
              className="max-h-32 min-h-14 resize-none rounded-none border-0 bg-transparent px-2 py-2 text-base shadow-none focus-visible:border-transparent focus-visible:ring-0 md:text-base dark:bg-transparent"
              placeholder="Tell the agent what to do..."
              disabled={!hydrated || chat.isPending}
              {...register("message")}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey) return;
                event.preventDefault();
                void handleSubmit(submit)();
              }}
            />

            <div className="flex min-h-10 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full"
                  title="Attach images"
                  aria-label="Attach images"
                  disabled={!hydrated || chat.isPending}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={(event) => void handleAttachmentChange(event)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 px-2",
                    variant === "page" && "xl:hidden",
                  )}
                  title="Open actions"
                  onClick={() => setMobileActionsOpen(true)}
                >
                  <CheckCircle2 />
                  <span className="hidden sm:inline">Actions</span>
                  {activeConversation?.actions.some(
                    (action) => action.status !== "completed",
                  ) ? (
                    <span className="bg-primary/15 text-primary rounded-full px-1.5 text-[10px] font-semibold">
                      {
                        activeConversation.actions.filter(
                          (action) => action.status !== "completed",
                        ).length
                      }
                    </span>
                  ) : null}
                </Button>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {activeConversation && settingsQuery.data?.source === "byok" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled
                    aria-label={`Agent model: ${getAiProviderLabel(
                      settingsQuery.data.provider,
                    )} ${settingsQuery.data.model}`}
                  >
                    <Sparkles />
                    <span className="max-w-52 truncate">
                      {getAiProviderLabel(settingsQuery.data.provider)} ·{" "}
                      {getAiModelLabel(
                        settingsQuery.data.provider,
                        settingsQuery.data.model,
                      )}
                    </span>
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full"
                  disabled={!hydrated || chat.isPending}
                  title="Send message"
                  aria-label="Send message"
                >
                  {chat.isPending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <ArrowUp />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </section>

      {variant === "page" ? (
        <aside className="hidden w-80 shrink-0 border-l xl:flex">
          <ActionsPanel
            actions={activeConversation?.actions ?? []}
            disabled={chat.isPending}
            onApprove={(action) => {
              if (!activeConversation) return;
              void runAgent(
                activeConversation.id,
                action.request,
                true,
                false,
                action.attachments,
                action.id,
              );
            }}
            onRemove={(actionId) => {
              if (!activeConversation) return;
              removeAction(activeConversation.id, actionId);
            }}
          />
        </aside>
      ) : null}
    </div>
  );
}
