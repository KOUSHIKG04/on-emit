"use client";

import { CalendarDays, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ConnectionState = "connected" | "missing_credentials" | "not_connected";

export function IntegrationStatus() {
  const { data, error, isLoading, refetch, isFetching } =
    api.integrations.status.useQuery();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1.5">
          <CardTitle>Connected services</CardTitle>

          <CardDescription>
            Gmail and Google Calendar are isolated using your authenticated
            Supabase user ID.
          </CardDescription>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={isFetching}
          aria-label="Refresh connection status"
          onClick={() => void refetch()}
        >
          <RefreshCw className={isFetching ? "animate-spin" : undefined} />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">
            Checking connections...
          </p>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : null}

        {data ? (
          <>
            <ConnectionRow icon={<Mail />} name="Gmail" state={data.gmail} />

            <ConnectionRow
              icon={<CalendarDays />}
              name="Google Calendar"
              state={data.googleCalendar}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ConnectionRowProps = {
  icon: React.ReactNode;
  name: string;
  state: ConnectionState;
};

function ConnectionRow({ icon, name, state }: ConnectionRowProps) {
  const labels: Record<ConnectionState, string> = {
    connected: "Connected",
    missing_credentials: "Missing credentials",
    not_connected: "Not connected",
  };

  return (
    <div className="border-border flex items-center justify-between border-b py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>

        <span className="font-medium">{name}</span>
      </div>

      <span className="text-muted-foreground text-sm">{labels[state]}</span>
    </div>
  );
}
