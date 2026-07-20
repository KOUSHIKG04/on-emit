"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle2, LoaderCircle, Send } from "@/components/icons";

import { parseEmailList } from "@/components/quick-actions/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/client";

type SendEmailValues = {
  to: string;
  cc: string;
  subject: string;
  body: string;
};

export function SendEmailForm() {
  const utils = api.useUtils();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SendEmailValues>({
    defaultValues: {
      to: "",
      cc: "",
      subject: "",
      body: "",
    },
  });

  const sendMutation = api.gmail.send.useMutation({
    async onSuccess() {
      setSent(true);
      reset();
      await utils.gmail.inbox.invalidate();
    },
  });

  async function submit(values: SendEmailValues) {
    setSent(false);
    sendMutation.reset();

    const to = parseEmailList(values.to);
    const cc = parseEmailList(values.cc);

    if (to.emails.length === 0) {
      setError("to", { message: "Add at least one recipient." });
      return;
    }

    if (to.invalid.length > 0) {
      setError("to", {
        message: `Check this address: ${to.invalid[0]}`,
      });
      return;
    }

    if (cc.invalid.length > 0) {
      setError("cc", {
        message: `Check this address: ${cc.invalid[0]}`,
      });
      return;
    }

    try {
      await sendMutation.mutateAsync({
        to: to.emails,
        cc: cc.emails,
        subject: values.subject,
        body: values.body,
      });
    } catch {
      // The mutation renders its safe server error inside the form.
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
      {sent ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" />
          Email sent successfully.
        </div>
      ) : null}

      {sendMutation.error ? (
        <FieldError>{sendMutation.error.message}</FieldError>
      ) : null}

      <Field data-invalid={Boolean(errors.to)}>
        <FieldLabel htmlFor="quick-email-to">To</FieldLabel>
        <Input
          id="quick-email-to"
          placeholder="friend@example.com, teammate@example.com"
          autoComplete="off"
          aria-invalid={Boolean(errors.to)}
          {...register("to", { required: "Add at least one recipient." })}
        />
        <FieldError errors={[errors.to]} />
      </Field>

      <Field data-invalid={Boolean(errors.cc)}>
        <FieldLabel htmlFor="quick-email-cc">CC</FieldLabel>
        <Input
          id="quick-email-cc"
          placeholder="Optional — separate addresses with commas"
          autoComplete="off"
          aria-invalid={Boolean(errors.cc)}
          {...register("cc")}
        />
        <FieldError errors={[errors.cc]} />
      </Field>

      <Field data-invalid={Boolean(errors.subject)}>
        <FieldLabel htmlFor="quick-email-subject">Subject</FieldLabel>
        <Input
          id="quick-email-subject"
          placeholder="What is this email about?"
          aria-invalid={Boolean(errors.subject)}
          {...register("subject", {
            required: "Enter a subject.",
            maxLength: {
              value: 998,
              message: "Subject is too long.",
            },
          })}
        />
        <FieldError errors={[errors.subject]} />
      </Field>

      <Field data-invalid={Boolean(errors.body)}>
        <FieldLabel htmlFor="quick-email-body">Message</FieldLabel>
        <Textarea
          id="quick-email-body"
          placeholder="Write your message..."
          className="min-h-36"
          aria-invalid={Boolean(errors.body)}
          {...register("body", {
            required: "Write a message.",
            maxLength: {
              value: 100_000,
              message: "Message is too long.",
            },
          })}
        />
        <FieldError errors={[errors.body]} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={sendMutation.isPending}>
          {sendMutation.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Send />
          )}
          {sendMutation.isPending ? "Sending..." : "Send email"}
        </Button>
      </div>
    </form>
  );
}
