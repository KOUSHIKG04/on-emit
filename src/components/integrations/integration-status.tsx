"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Mail,
  RefreshCw,
  Copy,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/client";
import { cn } from "@/lib/utils";

type ConnectionState = "connected" | "missing_credentials" | "not_connected";
type ConnectablePlugin = "gmail" | "googlecalendar";

type Service = {
  plugin: ConnectablePlugin;
  name: string;
  description: string;
  icon: React.ReactNode;
  state: ConnectionState;
};

export function IntegrationStatus({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [redirectingPlugin, setRedirectingPlugin] =
    useState<ConnectablePlugin | null>(null);

  const statusQuery = api.integrations.status.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const webhookQuery = api.integrations.webhookConfig.useQuery();

  const connectMutation = api.integrations.connect.useMutation({
    onSuccess(data, variables) {
      setRedirectingPlugin(variables.plugin);
      window.location.assign(data.connectUrl);
    },
    onError() {
      setRedirectingPlugin(null);
    },
  });

  useEffect(() => {
    if (statusQuery.data) {
      setRedirectingPlugin(null);
    }
  }, [statusQuery.data]);

  const services: Service[] = statusQuery.data
    ? [
        {
          plugin: "gmail",
          name: "Gmail",
          description: "Read, search, draft, and send email through Corsair.",
          icon: <Mail className="size-5" />,
          state: statusQuery.data.gmail,
        },
        {
          plugin: "googlecalendar",
          name: "Google Calendar",
          description: "Manage events, updates, and meeting invitations.",
          icon: <CalendarDays className="size-5" />,
          state: statusQuery.data.googleCalendar,
        },
      ]
    : [];

  function connect(plugin: ConnectablePlugin) {
    setRedirectingPlugin(plugin);
    connectMutation.mutate({ plugin });
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>Connected services</CardTitle>
          <CardDescription>
            Each connection is isolated using your authenticated Supabase user
            ID as its Corsair tenant ID.
          </CardDescription>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={statusQuery.isFetching}
          aria-label="Refresh connection status"
          onClick={() => void statusQuery.refetch()}
        >
          <RefreshCw
            className={statusQuery.isFetching ? "animate-spin" : undefined}
          />
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {statusQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Checking Corsair connections...
          </div>
        ) : null}

        {statusQuery.error ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border p-4 text-sm"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {statusQuery.error.message}
          </div>
        ) : null}

        {connectMutation.error ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border p-4 text-sm"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {connectMutation.error.message}
          </div>
        ) : null}

        {services.map((service) => (
          <ConnectionRow
            key={service.plugin}
            service={service}
            isConnecting={
              redirectingPlugin === service.plugin ||
              (connectMutation.isPending &&
                connectMutation.variables?.plugin === service.plugin)
            }
            onConnect={() => connect(service.plugin)}
          />
        ))}

        {webhookQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Preparing protected webhook endpoint...
          </div>
        ) : null}

        {webhookQuery.error ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border p-4 text-sm"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {webhookQuery.error.message}
          </div>
        ) : null}

        {webhookQuery.data ? (
          <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium">Realtime webhook endpoint</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Add this protected URL to the Corsair Gmail and Calendar webhook
                setup.
              </p>
              <code className="text-muted-foreground mt-2 block max-w-full truncate text-xs">
                {webhookQuery.data.url}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(webhookQuery.data.url);
                  setCopyError(null);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2_000);
                } catch {
                  setCopied(false);
                  setCopyError(
                    "Could not copy the webhook URL. Select and copy it manually.",
                  );
                }
              }}
            >
              <Copy />
              {copied ? "Copied" : "Copy URL"}
            </Button>
          </div>
        ) : null}

        {copyError ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-xl border p-4 text-sm"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            {copyError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type ConnectionRowProps = {
  service: Service;
  isConnecting: boolean;
  onConnect: () => void;
};

function ConnectionRow({
  service,
  isConnecting,
  onConnect,
}: ConnectionRowProps) {
  const isConnected = service.state === "connected";
  const isMissingCredentials = service.state === "missing_credentials";

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          {service.icon}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{service.name}</p>
            <ConnectionBadge state={service.state} />
          </div>
          <p className="text-muted-foreground mt-1 text-sm leading-5">
            {isMissingCredentials
              ? "OAuth credentials must be configured in Corsair before this service can connect."
              : service.description}
          </p>
        </div>
      </div>

      <Button
        type="button"
        variant={isConnected ? "outline" : "default"}
        disabled={isConnecting || isMissingCredentials}
        className="shrink-0 sm:min-w-28"
        onClick={onConnect}
      >
        {isConnecting ? (
          <>
            <LoaderCircle className="animate-spin" />
            Opening...
          </>
        ) : isConnected ? (
          "Reconnect"
        ) : (
          "Connect"
        )}
      </Button>
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === "connected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        Connected
      </span>
    );
  }

  if (state === "missing_credentials") {
    return (
      <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
        <CircleAlert className="size-3" />
        Setup required
      </span>
    );
  }

  return (
    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
      Not connected
    </span>
  );
}
