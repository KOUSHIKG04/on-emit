"use client";

import { CalendarDays, LoaderCircle, Mail } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";
import { toast } from "sonner";

type ConnectServicePromptProps = {
  plugin: "gmail" | "googlecalendar";
  accountId?: string;
  className?: string;
};

export function ConnectServicePrompt({
  plugin,
  accountId,
  className,
}: ConnectServicePromptProps) {
  const isGmail = plugin === "gmail";
  const name = isGmail ? "Gmail" : "Google Calendar";
  const Icon = isGmail ? Mail : CalendarDays;
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
    onError(error) {
      toast.error(`Could not connect ${name}`, {
        description: error.message,
      });
    },
  });

  return (
    <div
      className={cn(
        "flex min-h-64 flex-1 flex-col items-center justify-center px-6 text-center",
        className,
      )}
    >
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
        <Icon className="size-5" />
      </div>
      <p className="mt-4 font-medium">Connect {name} to continue</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm leading-relaxed">
        {isGmail
          ? "Connect Gmail through Corsair to load, search, and manage your email."
          : "Connect Google Calendar through Corsair to view and manage your schedule."}
      </p>
      <Button
        type="button"
        className="mt-5"
        disabled={connect.isPending}
        onClick={() => connect.mutate({ plugin, accountId })}
      >
        {connect.isPending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <Icon />
        )}
        {connect.isPending ? "Opening Google..." : `Connect ${name}`}
      </Button>
    </div>
  );
}
