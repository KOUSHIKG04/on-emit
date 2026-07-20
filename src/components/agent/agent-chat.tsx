"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Bot, LoaderCircle, Send, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type Values = { message: string };

export function AgentChat() {
  const [reply, setReply] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<Values>();
  const chat = api.agent.chat.useMutation({
    onSuccess: (data) => setReply(data.reply),
  });

  async function submit(values: Values, confirmed = false) {
    setPendingMessage(values.message);
    setReply(null);
    try {
      await chat.mutateAsync({ message: values.message, confirmed });
    } catch {}
  }

  return (
    <Card className="mx-auto w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot /> Corsair agent
        </CardTitle>
        <CardDescription>
          Ask one workflow to search mail, prepare an email, or schedule a
          meeting. Writes require confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {reply ? (
          <div className="bg-muted rounded-xl p-4 text-sm whitespace-pre-wrap">
            {reply}
          </div>
        ) : null}
        {chat.error ? <FieldError>{chat.error.message}</FieldError> : null}
        <form className="space-y-3" onSubmit={handleSubmit((v) => submit(v))}>
          <Field data-invalid={Boolean(formState.errors.message)}>
            <Textarea
              className="min-h-32"
              placeholder="Send a calendar invite to friend@example.com next Thursday at 9 AM, then email them."
              {...register("message", { required: "Enter a request." })}
            />
            <FieldError errors={[formState.errors.message]} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            {pendingMessage && reply ? (
              <Button
                type="button"
                variant="outline"
                disabled={chat.isPending}
                onClick={() => void submit({ message: pendingMessage }, true)}
              >
                <ShieldCheck /> Confirm and execute
              </Button>
            ) : null}
            <Button type="submit" disabled={chat.isPending}>
              {chat.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Send />
              )}
              Preview with agent
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
