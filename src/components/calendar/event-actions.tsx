"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarX,
  CheckCircle2,
  LoaderCircle,
  Pencil,
  Save,
} from "lucide-react";

import { parseEmailList } from "@/components/quick-actions/form-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, type RouterOutputs } from "@/trpc/client";

type CalendarEvent = RouterOutputs["calendar"]["upcoming"][number];

type EventFormValues = {
  title: string;
  attendees: string;
  startsAt: string;
  endsAt: string;
  location: string;
  description: string;
};

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultValues(event: CalendarEvent): EventFormValues {
  return {
    title: event.title,
    attendees: event.attendees.map((attendee) => attendee.email).join(", "),
    startsAt: event.allDay ? event.start : toLocalDateTimeInput(event.start),
    endsAt: event.allDay
      ? (event.end ?? event.start)
      : event.end
        ? toLocalDateTimeInput(event.end)
        : toLocalDateTimeInput(
            new Date(
              new Date(event.start).getTime() + 30 * 60_000,
            ).toISOString(),
          ),
    location: event.location ?? "",
    description: event.description ?? "",
  };
}

export function EventActions({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updated, setUpdated] = useState(false);
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const utils = api.useUtils();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({ defaultValues: defaultValues(event) });

  const updateMutation = api.calendar.updateEvent.useMutation({
    async onSuccess() {
      setUpdated(true);
      await Promise.all([
        utils.calendar.upcoming.invalidate(),
        utils.calendar.range.invalidate(),
      ]);
    },
  });

  const deleteMutation = api.calendar.deleteEvent.useMutation({
    async onSuccess() {
      await Promise.all([
        utils.calendar.upcoming.invalidate(),
        utils.calendar.range.invalidate(),
      ]);
      setOpen(false);
    },
  });

  async function submit(values: EventFormValues) {
    setUpdated(false);
    updateMutation.reset();

    const attendees = parseEmailList(values.attendees);

    if (attendees.invalid.length > 0) {
      setError("attendees", {
        message: `Check this address: ${attendees.invalid[0]}`,
      });
      return;
    }

    const startDate = event.allDay ? null : new Date(values.startsAt);
    const endDate = event.allDay ? null : new Date(values.endsAt);

    if (
      (startDate && Number.isNaN(startDate.getTime())) ||
      (endDate && Number.isNaN(endDate.getTime()))
    ) {
      setError("endsAt", { message: "Choose valid start and end times." });
      return;
    }

    const startsAt = event.allDay ? values.startsAt : startDate!.toISOString();
    const endsAt = event.allDay ? values.endsAt : endDate!.toISOString();

    try {
      await updateMutation.mutateAsync({
        eventId: event.id,
        title: values.title,
        attendees: attendees.emails,
        startsAt,
        endsAt,
        allDay: event.allDay,
        timeZone,
        location: values.location,
        description: values.description,
      });
    } catch {
      // The mutation renders its safe server error in the dialog.
    }
  }

  async function deleteEvent() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    try {
      await deleteMutation.mutateAsync({ eventId: event.id });
    } catch {
      // The mutation renders its safe server error in the dialog.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setConfirmDelete(false);
        setUpdated(false);

        if (nextOpen) {
          reset(defaultValues(event));
        }
      }}
    >
      <Button
        type="button"
        size={compact ? "icon-xs" : "icon-sm"}
        variant="ghost"
        aria-label={`Edit ${event.title}`}
        onClick={() => setOpen(true)}
      >
        <Pencil />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit calendar event</DialogTitle>
          <DialogDescription>
            Changes and cancellations are sent to attendees through Google
            Calendar.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
          {updated ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Event updated and attendees notified.
            </p>
          ) : null}

          {updateMutation.error ? (
            <FieldError>{updateMutation.error.message}</FieldError>
          ) : null}
          {deleteMutation.error ? (
            <FieldError>{deleteMutation.error.message}</FieldError>
          ) : null}

          <Field data-invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor={`event-title-${event.id}`}>Title</FieldLabel>
            <Input
              id={`event-title-${event.id}`}
              aria-invalid={Boolean(errors.title)}
              {...register("title", { required: "Enter an event title." })}
            />
            <FieldError errors={[errors.title]} />
          </Field>

          <Field data-invalid={Boolean(errors.attendees)}>
            <FieldLabel htmlFor={`event-attendees-${event.id}`}>
              Attendees
            </FieldLabel>
            <Input
              id={`event-attendees-${event.id}`}
              placeholder="Separate email addresses with commas"
              aria-invalid={Boolean(errors.attendees)}
              {...register("attendees")}
            />
            <FieldError errors={[errors.attendees]} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field data-invalid={Boolean(errors.startsAt)}>
              <FieldLabel htmlFor={`event-start-${event.id}`}>
                Starts
              </FieldLabel>
              <Input
                id={`event-start-${event.id}`}
                type={event.allDay ? "date" : "datetime-local"}
                aria-invalid={Boolean(errors.startsAt)}
                {...register("startsAt", { required: "Choose a start." })}
              />
              <FieldError errors={[errors.startsAt]} />
            </Field>

            <Field data-invalid={Boolean(errors.endsAt)}>
              <FieldLabel htmlFor={`event-end-${event.id}`}>Ends</FieldLabel>
              <Input
                id={`event-end-${event.id}`}
                type={event.allDay ? "date" : "datetime-local"}
                aria-invalid={Boolean(errors.endsAt)}
                {...register("endsAt", { required: "Choose an end." })}
              />
              <FieldError errors={[errors.endsAt]} />
            </Field>
          </div>

          <p className="text-muted-foreground -mt-2 text-xs">
            {event.allDay ? "All-day event" : `Timezone: ${timeZone}`}
          </p>

          <Field data-invalid={Boolean(errors.location)}>
            <FieldLabel htmlFor={`event-location-${event.id}`}>
              Location
            </FieldLabel>
            <Input
              id={`event-location-${event.id}`}
              placeholder="Optional"
              aria-invalid={Boolean(errors.location)}
              {...register("location")}
            />
            <FieldError errors={[errors.location]} />
          </Field>

          <Field data-invalid={Boolean(errors.description)}>
            <FieldLabel htmlFor={`event-description-${event.id}`}>
              Description
            </FieldLabel>
            <Textarea
              id={`event-description-${event.id}`}
              className="min-h-28"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending || updateMutation.isPending}
              onClick={() => void deleteEvent()}
            >
              {deleteMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <CalendarX />
              )}
              {confirmDelete ? "Confirm cancellation" : "Cancel event"}
            </Button>

            <Button
              type="submit"
              disabled={updateMutation.isPending || deleteMutation.isPending}
            >
              {updateMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
