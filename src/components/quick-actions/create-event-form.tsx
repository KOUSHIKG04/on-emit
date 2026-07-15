"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";

import { parseEmailList } from "@/components/quick-actions/form-utils";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

type CreateEventValues = {
  title: string;
  attendees: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
  description: string;
};

function toLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join("T");
}

function getDefaultStart() {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(Math.ceil((date.getMinutes() + 1) / 30) * 30);
  return toLocalDateTimeInput(date);
}

export function CreateEventForm() {
  const utils = api.useUtils();
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const [createdEvent, setCreatedEvent] = useState<{
    htmlLink: string | null;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateEventValues>({
    defaultValues: {
      title: "",
      attendees: "",
      startsAt: getDefaultStart(),
      durationMinutes: 30,
      location: "",
      description: "",
    },
  });

  const createMutation = api.calendar.createEvent.useMutation({
    async onSuccess(data) {
      setCreatedEvent({ htmlLink: data.htmlLink });
      reset({
        title: "",
        attendees: "",
        startsAt: getDefaultStart(),
        durationMinutes: 30,
        location: "",
        description: "",
      });
      await utils.calendar.upcoming.invalidate();
    },
  });

  async function submit(values: CreateEventValues) {
    setCreatedEvent(null);
    createMutation.reset();

    const attendees = parseEmailList(values.attendees);

    if (attendees.invalid.length > 0) {
      setError("attendees", {
        message: `Check this address: ${attendees.invalid[0]}`,
      });
      return;
    }

    const start = new Date(values.startsAt);

    if (Number.isNaN(start.getTime())) {
      setError("startsAt", { message: "Choose a valid start date and time." });
      return;
    }

    const end = new Date(start.getTime() + values.durationMinutes * 60_000);

    try {
      await createMutation.mutateAsync({
        title: values.title,
        attendees: attendees.emails,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        timeZone,
        location: values.location,
        description: values.description,
      });
    } catch {
      // The mutation renders its safe server error inside the form.
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
      {createdEvent !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            Calendar event created and invitations sent.
          </span>
          {createdEvent.htmlLink ? (
            <a
              href={createdEvent.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
            >
              Open event
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      ) : null}

      {createMutation.error ? (
        <FieldError>{createMutation.error.message}</FieldError>
      ) : null}

      <Field data-invalid={Boolean(errors.title)}>
        <FieldLabel htmlFor="quick-event-title">Event title</FieldLabel>
        <Input
          id="quick-event-title"
          placeholder="Weekly project check-in"
          aria-invalid={Boolean(errors.title)}
          {...register("title", { required: "Enter an event title." })}
        />
        <FieldError errors={[errors.title]} />
      </Field>

      <Field data-invalid={Boolean(errors.attendees)}>
        <FieldLabel htmlFor="quick-event-attendees">Attendees</FieldLabel>
        <Input
          id="quick-event-attendees"
          placeholder="friend@example.com, teammate@example.com"
          autoComplete="off"
          aria-invalid={Boolean(errors.attendees)}
          {...register("attendees")}
        />
        <FieldError errors={[errors.attendees]} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Field data-invalid={Boolean(errors.startsAt)}>
          <FieldLabel htmlFor="quick-event-start">Starts</FieldLabel>
          <Input
            id="quick-event-start"
            type="datetime-local"
            aria-invalid={Boolean(errors.startsAt)}
            {...register("startsAt", {
              required: "Choose a start date and time.",
            })}
          />
          <FieldError errors={[errors.startsAt]} />
        </Field>

        <Field data-invalid={Boolean(errors.durationMinutes)}>
          <FieldLabel htmlFor="quick-event-duration">Duration</FieldLabel>
          <select
            id="quick-event-duration"
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3"
            aria-invalid={Boolean(errors.durationMinutes)}
            {...register("durationMinutes", { valueAsNumber: true })}
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
          <FieldError errors={[errors.durationMinutes]} />
        </Field>
      </div>

      <p className="text-muted-foreground -mt-2 text-xs">
        Timezone: {timeZone}
      </p>

      <Field data-invalid={Boolean(errors.location)}>
        <FieldLabel htmlFor="quick-event-location">Location</FieldLabel>
        <Input
          id="quick-event-location"
          placeholder="Optional — meeting room or video link"
          aria-invalid={Boolean(errors.location)}
          {...register("location")}
        />
        <FieldError errors={[errors.location]} />
      </Field>

      <Field data-invalid={Boolean(errors.description)}>
        <FieldLabel htmlFor="quick-event-description">Description</FieldLabel>
        <Textarea
          id="quick-event-description"
          placeholder="Add an agenda or useful context..."
          className="min-h-28"
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />
        <FieldError errors={[errors.description]} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <CalendarPlus />
          )}
          {createMutation.isPending ? "Creating..." : "Create and invite"}
        </Button>
      </div>
    </form>
  );
}
