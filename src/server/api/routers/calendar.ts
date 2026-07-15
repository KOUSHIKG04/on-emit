import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair, getTenantCorsair } from "@/server/corsair";

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
