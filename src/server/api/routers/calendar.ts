import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair, getTenantCorsair } from "@/server/corsair";

const attendeeEmail = z.string().trim().email().max(320);

const createEventInput = z
  .object({
    title: z.string().trim().min(1).max(500),
    description: z.string().max(20_000).default(""),
    location: z.string().trim().max(1_000).default(""),
    attendees: z.array(attendeeEmail).max(100).default([]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timeZone: z.string().trim().min(1).max(100),
  })
  .superRefine((value, context) => {
    const start = new Date(value.startsAt).getTime();
    const end = new Date(value.endsAt).getTime();

    if (end <= start) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Event end time must be after its start time.",
      });
    }

    if (end - start > 24 * 60 * 60 * 1_000) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Quick Action events cannot be longer than 24 hours.",
      });
    }
  });

function getMeetingUrl(event: {
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
  };
}) {
  if (event.hangoutLink) {
    return event.hangoutLink;
  }

  const videoEntry = event.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video",
  );

  return videoEntry?.uri ?? null;
}

export const calendarRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(createEventInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const connectionStatus = await corsair.manage.connectionStatus.get({
          tenantId: ctx.userId,
        });

        if (connectionStatus.googlecalendar !== "connected") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Connect Google Calendar before creating an event.",
          });
        }

        const tenantCorsair = getTenantCorsair(ctx.userId);
        const event = await tenantCorsair.googlecalendar.api.events.create({
          calendarId: "primary",
          event: {
            summary: input.title,
            ...(input.description ? { description: input.description } : {}),
            ...(input.location ? { location: input.location } : {}),
            start: {
              dateTime: input.startsAt,
              timeZone: input.timeZone,
            },
            end: {
              dateTime: input.endsAt,
              timeZone: input.timeZone,
            },
            attendees: input.attendees.map((email) => ({ email })),
            guestsCanInviteOthers: true,
            guestsCanSeeOtherGuests: true,
          },
          sendUpdates: input.attendees.length > 0 ? "all" : "none",
        });

        return {
          id: event.id ?? null,
          htmlLink: event.htmlLink ?? null,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("Failed to create Google Calendar event:", error);

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            "Google Calendar could not create this event. Please try again.",
        });
      }
    }),

  upcoming: protectedProcedure.query(async ({ ctx }) => {
    try {
      const connectionStatus = await corsair.manage.connectionStatus.get({
        tenantId: ctx.userId,
      });

      if (connectionStatus.googlecalendar !== "connected") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connect Google Calendar before loading events.",
        });
      }

      const tenantCorsair = getTenantCorsair(ctx.userId);

      const now = new Date();

      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const response = await tenantCorsair.googlecalendar.api.events.getMany({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: sevenDaysFromNow.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 50,
        showDeleted: false,
      });

      const events = (response.items ?? [])
        .map((event) => {
          const start = event.start?.dateTime ?? event.start?.date ?? null;
          const end = event.end?.dateTime ?? event.end?.date ?? null;

          if (!event.id || !start) {
            return null;
          }

          const attendees = (event.attendees ?? [])
            .filter(
              (
                attendee,
              ): attendee is typeof attendee & {
                email: string;
              } => Boolean(attendee.email),
            )
            .map((attendee) => ({
              email: attendee.email,
              displayName: attendee.displayName ?? null,
              responseStatus: attendee.responseStatus ?? null,
            }));

          return {
            id: event.id,
            title: event.summary ?? "(Untitled event)",
            description: event.description ?? null,
            start,
            end,
            allDay: Boolean(event.start?.date && !event.start?.dateTime),
            location: event.location ?? null,
            meetingUrl: getMeetingUrl(event),
            htmlLink: event.htmlLink ?? null,
            status: event.status ?? null,
            attendees,
          };
        })
        .filter((event): event is NonNullable<typeof event> => event !== null);

      return events;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("Failed to load Google Calendar:", error);

      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Google Calendar could not be loaded. Please try again.",
      });
    }
  }),
});
