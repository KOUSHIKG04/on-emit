"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Archive,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Mail,
  MailOpen,
  Reply,
  Send,
  X,
} from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { useWorkspaceStore } from "@/providers/workspace-store-provider";
import { api } from "@/trpc/client";

type ThreadActionsProps = {
  threadId: string;
  messageId: string | null;
  unread: boolean;
  onArchived?: () => void;
};

type ReplyFormValues = {
  body: string;
};

type ThreadAction = "archive" | "mark_read" | "mark_unread";

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

export function ThreadActions({
  threadId,
  messageId,
  unread,
  onArchived,
}: ThreadActionsProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const selectThread = useWorkspaceStore((state) => state.selectThread);
  const utils = api.useUtils();

  const actionMutation = api.gmail.threadAction.useMutation({
    async onSuccess(data) {
      const msg =
        data.action === "archive"
          ? "Conversation archived."
          : data.action === "mark_read"
            ? "Conversation marked as read."
            : "Conversation marked as unread.";

      setFeedback(msg);
      if (data.action === "archive") {
        toast.success("Archived", {
          description: "Conversation moved out of inbox.",
        });
      } else {
        toast.info("Thread Updated", { description: msg });
      }

      await utils.gmail.inbox.invalidate();

      if (data.action === "archive") {
        if (onArchived) {
          onArchived();
        } else {
          selectThread(null);
        }
      } else {
        await utils.gmail.thread.invalidate({ threadId });
      }
    },
    onError(error) {
      toast.error("Action Failed", {
        description: error.message || "Could not update conversation state.",
      });
    },
  });

  function runAction(action: ThreadAction) {
    setFeedback(null);
    actionMutation.reset();
    actionMutation.mutate({ threadId, action });
  }

  const runShortcutAction = useRef(runAction);
  useEffect(() => {
    runShortcutAction.current = runAction;
  });

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "r" && messageId) {
        event.preventDefault();
        setReplyOpen(true);
      } else if (key === "e") {
        event.preventDefault();
        runShortcutAction.current("archive");
      } else if (event.shiftKey && key === "i") {
        event.preventDefault();
        runShortcutAction.current("mark_read");
      } else if (event.shiftKey && key === "u") {
        event.preventDefault();
        runShortcutAction.current("mark_unread");
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [messageId]);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!messageId}
          onClick={() => setReplyOpen((open) => !open)}
        >
          <Reply />
          Reply
          <kbd className="bg-primary-foreground/15 ml-1 rounded px-1 font-mono text-[10px]">
            R
          </kbd>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionMutation.isPending}
          onClick={() => runAction("archive")}
        >
          <Archive />
          Archive
          <kbd className="bg-muted ml-1 rounded px-1 font-mono text-[10px]">
            E
          </kbd>
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionMutation.isPending}
          onClick={() => runAction(unread ? "mark_read" : "mark_unread")}
        >
          {unread ? <MailOpen /> : <Mail />}
          {unread ? "Mark read" : "Mark unread"}
        </Button>

        {actionMutation.isPending ? (
          <LoaderCircle className="text-muted-foreground size-4 animate-spin" />
        ) : null}
      </div>

      {actionMutation.error ? (
        <FieldError>{actionMutation.error.message}</FieldError>
      ) : null}

      {feedback ? (
        <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {feedback}
        </p>
      ) : null}

      {replyOpen && messageId ? (
        <ReplyComposer
          threadId={threadId}
          messageId={messageId}
          onClose={() => setReplyOpen(false)}
        />
      ) : null}
    </div>
  );
}

type ReplyComposerProps = {
  threadId: string;
  messageId: string;
  onClose: () => void;
};

function ReplyComposer({ threadId, messageId, onClose }: ReplyComposerProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const utils = api.useUtils();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyFormValues>({ defaultValues: { body: "" } });

  const replyMutation = api.gmail.reply.useMutation({
    async onSuccess() {
      setFeedback("Reply sent.");
      toast.success("Reply Sent", {
        description: "Your email reply was delivered.",
      });
      reset();
      await Promise.all([
        utils.gmail.thread.invalidate({ threadId }),
        utils.gmail.inbox.invalidate(),
      ]);
    },
    onError(error) {
      toast.error("Failed to Send Reply", {
        description: error.message || "Email could not be delivered.",
      });
    },
  });

  const draftMutation = api.gmail.saveReplyDraft.useMutation({
    onSuccess() {
      setFeedback("Draft saved in Gmail.");
      toast.success("Draft Saved", {
        description: "Saved reply draft to Gmail.",
      });
    },
    onError(error) {
      toast.error("Failed to Save Draft", {
        description: error.message || "Draft could not be saved.",
      });
    },
  });

  const pending = replyMutation.isPending || draftMutation.isPending;

  async function submit(values: ReplyFormValues, mode: "send" | "draft") {
    setFeedback(null);
    replyMutation.reset();
    draftMutation.reset();

    try {
      if (mode === "send") {
        await replyMutation.mutateAsync({
          threadId,
          messageId,
          body: values.body,
        });
      } else {
        await draftMutation.mutateAsync({
          threadId,
          messageId,
          body: values.body,
        });
      }
    } catch {
      // Each mutation renders its safe server error below the editor.
    }
  }

  const sendReply = handleSubmit((values) => submit(values, "send"));
  const saveDraft = handleSubmit((values) => submit(values, "draft"));

  return (
    <form
      className="bg-background space-y-3 rounded-xl border p-3"
      noValidate
      onSubmit={(event) => void sendReply(event)}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Reply className="size-4" />
          Reply to conversation
        </p>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Close reply editor"
          onClick={onClose}
        >
          <X />
        </Button>
      </div>

      <Field data-invalid={Boolean(errors.body)}>
        <FieldLabel htmlFor={`reply-${messageId}`} className="sr-only">
          Reply
        </FieldLabel>
        <Textarea
          id={`reply-${messageId}`}
          autoFocus
          className="min-h-32"
          placeholder="Write a reply..."
          aria-invalid={Boolean(errors.body)}
          {...register("body", { required: "Write a reply first." })}
        />
        <FieldError errors={[errors.body]} />
      </Field>

      {replyMutation.error ? (
        <FieldError>{replyMutation.error.message}</FieldError>
      ) : null}
      {draftMutation.error ? (
        <FieldError>{draftMutation.error.message}</FieldError>
      ) : null}
      {feedback ? (
        <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          {feedback}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          Press Ctrl/⌘ + Enter to send
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void saveDraft()}
          >
            {draftMutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <FileText />
            )}
            Save draft
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {replyMutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Send />
            )}
            Send reply
          </Button>
        </div>
      </div>
    </form>
  );
}
