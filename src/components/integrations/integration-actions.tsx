"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Mail,
  RefreshCw,
} from "@/components/icons";
import type { TablerIcon } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { api } from "@/trpc/client";

type Plugin = "gmail" | "googlecalendar";

export function IntegrationActions() {
  const status = api.integrations.status.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const connect = api.integrations.connect.useMutation({
    onMutate(variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      toast.info(`Connecting to ${name}...`, {
        description: "Opening Google sign-in authorization page.",
      });
    },
    onSuccess(data) {
      window.location.assign(data.connectUrl);
    },
    onError(error, variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      toast.error(`Failed to connect ${name}`, {
        description: error.message || "Could not generate authorization link.",
      });
    },
  });

  function connectPlugin(plugin: Plugin) {
    connect.mutate({ plugin });
  }

  return (
    <div className="flex items-center gap-2">
      <ConnectionButton
        label="Gmail"
        connected={status.data?.gmail === "connected"}
        loading={
          status.isLoading ||
          (connect.isPending && connect.variables?.plugin === "gmail")
        }
        icon={Mail}
        onClick={() => connectPlugin("gmail")}
      />
      <ConnectionButton
        label="Calendar"
        connected={status.data?.googleCalendar === "connected"}
        loading={
          status.isLoading ||
          (connect.isPending && connect.variables?.plugin === "googlecalendar")
        }
        icon={CalendarDays}
        onClick={() => connectPlugin("googlecalendar")}
      />
    </div>
  );
}

type ConnectionButtonProps = {
  label: string;
  connected: boolean;
  loading: boolean;
  icon: TablerIcon;
  onClick: () => void;
};

function ConnectionButton({
  label,
  connected,
  loading,
  icon: Icon,
  onClick,
}: ConnectionButtonProps) {
  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={loading}
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`${label} connection options`}
            />
          }
        >
          {loading ? <LoaderCircle className="animate-spin" /> : <Icon />}
          <span className="hidden xl:inline">{label}</span>
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          <ChevronDown className="text-muted-foreground size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            {label} connected
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClick}>
            <RefreshCw />
            Reconnect {label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={loading}
      aria-label={`Connect ${label}`}
      onClick={onClick}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : <Icon />}
      <span className="hidden xl:inline">Connect {label}</span>
    </Button>
  );
}
