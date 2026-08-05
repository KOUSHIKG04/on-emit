"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  AlertCircle,
  CalendarDays,
  LoaderCircle,
  Mail,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";

type Plugin = "gmail" | "googlecalendar";

const serviceDetails = {
  gmail: {
    name: "Gmail",
    description: "Search, send, and manage your email.",
    icon: Mail,
  },
  googlecalendar: {
    name: "Google Calendar",
    description: "View your schedule and send invitations.",
    icon: CalendarDays,
  },
} satisfies Record<
  Plugin,
  { name: string; description: string; icon: typeof Mail }
>;

export function WorkspaceConnectionBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const status = api.integrations.status.useQuery(undefined, {
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
  const connect = api.integrations.connect.useMutation({
    onSuccess(data) {
      const url = new URL(data.connectUrl);
      if (typeof window !== "undefined") {
        url.searchParams.set(
          "returnTo",
          window.location.pathname + window.location.search,
        );
      }
      window.location.assign(url.toString());
    },
    onError(error, variables) {
      toast.error(
        `Could not connect ${serviceDetails[variables.plugin].name}`,
        {
          description: error.message,
        },
      );
    },
  });

  if (pathname.startsWith("/settings") || status.isLoading) {
    return children;
  }

  if (status.error) {
    return (
      <>
        <div
          role="alert"
          className="bg-destructive/8 text-foreground flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
        >
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <AlertCircle className="text-destructive size-4 shrink-0" />
            Connection status could not be checked.
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={status.isFetching}
            onClick={() => void status.refetch()}
          >
            {status.isFetching ? (
              <LoaderCircle className="animate-spin" />
            ) : null}
            Try again
          </Button>
        </div>
        {children}
      </>
    );
  }

  const missing: Plugin[] = [];
  if (status.data?.gmail !== "connected") missing.push("gmail");
  if (status.data?.googleCalendar !== "connected") {
    missing.push("googlecalendar");
  }

  if (missing.length === 0) return children;

  const connectService = (plugin: Plugin) => {
    connect.mutate({
      plugin,
      accountId: status.data?.activeAccountId,
    });
  };

  if (missing.length === 2) {
    const gmailPending =
      connect.isPending && connect.variables?.plugin === "gmail";
    const calendarPending =
      connect.isPending && connect.variables?.plugin === "googlecalendar";

    const GmailIcon = serviceDetails.gmail.icon;
    const CalendarIcon = serviceDetails.googlecalendar.icon;

    return (
      <section className="bg-muted/15 flex min-h-0 flex-1 items-center justify-center px-5 py-10 md:px-10">
        <div className="w-full max-w-3xl">
          <div className=" flex flex-col justify-between gap-4 rounded-2xl  p-5 shadow-sm sm:flex-row sm:items-center md:p-6">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <div className="flex shrink-0 items-center -space-x-2">
                <span className="bg-primary/10 text-primary ring-card flex size-10 items-center justify-center rounded-xl ring-4">
                  <GmailIcon className="size-5" />
                </span>
                <span className="bg-primary/10 text-primary ring-card flex size-10 items-center justify-center rounded-xl ring-4">
                  <CalendarIcon className="size-5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-semibold tracking-tight sm:text-lg">
                  Connect Gmail & Calendar
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full justify-center gap-2 sm:w-auto"
                disabled={connect.isPending}
                onClick={() => connectService("gmail")}
              >
                {gmailPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <GmailIcon className="size-4" />
                )}
                {gmailPending ? "Opening..." : "Connect Gmail"}
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full justify-center gap-2 sm:w-auto"
                disabled={connect.isPending}
                onClick={() => connectService("googlecalendar")}
              >
                {calendarPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <CalendarIcon className="size-4" />
                )}
                {calendarPending ? "Opening..." : "Connect Calendar"}
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const plugin = missing[0]!;
  const pageHandlesMissingService =
    (pathname === "/inbox" && plugin === "gmail") ||
    (pathname === "/calendar" && plugin === "googlecalendar");

  if (pageHandlesMissingService) return children;

  const service = serviceDetails[plugin];
  const Icon = service.icon;

  return (
    <>
      <div
        role="status"
        className="bg-primary/8 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="bg-primary/12 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {service.name} is disconnected
            </p>
            <p className="text-muted-foreground truncate text-xs">
              Connect it to restore all workspace features.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={connect.isPending}
          onClick={() => connectService(plugin)}
        >
          {connect.isPending ? <LoaderCircle className="animate-spin" /> : null}
          {connect.isPending ? "Opening..." : "Connect"}
        </Button>
      </div>
      {children}
    </>
  );
}
