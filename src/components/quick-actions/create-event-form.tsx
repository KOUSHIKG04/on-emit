"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  LoaderCircle,
} from "@/components/icons";

import { parseEmailList } from "@/components/quick-actions/form-utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/client";

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

function parseLocalDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const startDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const durationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
] as const;

const timeOptions = Array.from({ length: 96 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const displayHour = hours % 12 || 12;

  return {
    value,
    label: `${displayHour}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`,
  };
});

export function CreateEventForm() {
  const utils = api.useUtils();
  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    [],
  );
  const [createdEvent, setCreatedEvent] = useState<{
    htmlLink: string | null;
  } | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
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
  const startsAt = watch("startsAt");
  const durationMinutes = watch("durationMinutes");
  const selectedStart = parseLocalDateTime(startsAt);
  const selectedTime = startsAt.split("T")[1]?.slice(0, 5) ?? "";
  const selectedDuration =
    durationOptions.find((option) => option.value === durationMinutes) ??
    durationOptions[1];

  function changeStartDate(date: Date | undefined) {
    if (!date) return;

    const next = selectedStart ?? parseLocalDateTime(getDefaultStart())!;
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setValue("startsAt", toLocalDateTimeInput(next), {
      shouldDirty: true,
      shouldValidate: true,
    });
    setDatePickerOpen(false);
  }

  function changeStartTime(value: string) {
    const [hours, minutes] = value.split(":").map(Number);
    if (
      hours === undefined ||
      minutes === undefined ||
      !Number.isFinite(hours) ||
      !Number.isFinite(minutes)
    ) {
      return;
    }

    const next = selectedStart ?? parseLocalDateTime(getDefaultStart())!;
    next.setHours(hours, minutes, 0, 0);
    setValue("startsAt", toLocalDateTimeInput(next), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

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
      await Promise.all([
        utils.calendar.upcoming.invalidate(),
        utils.calendar.range.invalidate(),
      ]);
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

      <input
        type="hidden"
        {...register("startsAt", {
          required: "Choose a start date and time.",
        })}
      />

      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_145px_150px]">
        <Field data-invalid={Boolean(errors.startsAt)}>
          <FieldLabel htmlFor="quick-event-start">Starts</FieldLabel>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button
                  id="quick-event-start"
                  type="button"
                  variant="outline"
                  className="w-full justify-start px-3 font-normal"
                  aria-invalid={Boolean(errors.startsAt)}
                />
              }
            >
              <CalendarDays className="text-muted-foreground" />
              <span className="truncate">
                {selectedStart
                  ? startDateFormatter.format(selectedStart)
                  : "Choose a date"}
              </span>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedStart ?? undefined}
                defaultMonth={selectedStart ?? undefined}
                onSelect={changeStartDate}
              />
            </PopoverContent>
          </Popover>
          <FieldError errors={[errors.startsAt]} />
        </Field>

        <Field data-invalid={Boolean(errors.startsAt)}>
          <FieldLabel htmlFor="quick-event-time">Time</FieldLabel>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  id="quick-event-time"
                  type="button"
                  variant="outline"
                  className="w-full justify-between px-3 font-normal"
                  aria-invalid={Boolean(errors.startsAt)}
                />
              }
            >
              <span className="flex min-w-0 items-center gap-2">
                <Clock3 className="text-muted-foreground" />
                <span className="truncate">
                  {timeOptions.find((option) => option.value === selectedTime)
                    ?.label ?? selectedTime}
                </span>
              </span>
              <ChevronDown className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-72 min-w-(--anchor-width) overflow-y-auto"
            >
              <DropdownMenuRadioGroup
                value={selectedTime}
                onValueChange={changeStartTime}
              >
                {timeOptions.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </Field>

        <Field data-invalid={Boolean(errors.durationMinutes)}>
          <FieldLabel htmlFor="quick-event-duration">Duration</FieldLabel>
          <input
            type="hidden"
            {...register("durationMinutes", { valueAsNumber: true })}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  id="quick-event-duration"
                  type="button"
                  variant="outline"
                  className="w-full justify-between px-3 font-normal"
                  aria-invalid={Boolean(errors.durationMinutes)}
                />
              }
            >
              <span>{selectedDuration.label}</span>
              <ChevronDown className="text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {durationOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    setValue("durationMinutes", option.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
