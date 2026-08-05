"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Mail,
  RefreshCw,
  Unlink,
} from "@/components/icons";
import type { TablerIcon } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const utils = api.useUtils();
  const [disconnectPlugin, setDisconnectPlugin] = useState<Plugin | null>(null);
  const status = api.integrations.status.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const disconnect = api.integrations.disconnect.useMutation({
    async onSuccess(_, variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      setDisconnectPlugin(null);
      await Promise.all([
        utils.integrations.status.invalidate(),
        variables.plugin === "gmail"
          ? utils.gmail.invalidate()
          : utils.calendar.invalidate(),
      ]);
      toast.success(`${name} disconnected`, {
        description: `On Emit no longer has access to this ${name} connection.`,
      });
    },
    onError(error, variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      toast.error(`Failed to disconnect ${name}`, {
        description: error.message,
      });
    },
  });
  const connect = api.integrations.connect.useMutation({
    onMutate(variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      toast.info(`Connecting to ${name}...`, {
        description: "Opening Google sign-in authorization page.",
      });
    },
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
        onDisconnect={() => setDisconnectPlugin("gmail")}
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
        onDisconnect={() => setDisconnectPlugin("googlecalendar")}
      />

      <DisconnectDialog
        plugin={disconnectPlugin}
        pending={disconnect.isPending}
        onOpenChange={(open) => {
          if (!open && !disconnect.isPending) setDisconnectPlugin(null);
        }}
        onConfirm={() => {
          if (disconnectPlugin) {
            disconnect.mutate({ plugin: disconnectPlugin });
          }
        }}
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
  onDisconnect: () => void;
};

function ConnectionButton({
  label,
  connected,
  loading,
  icon: Icon,
  onClick,
  onDisconnect,
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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDisconnect}
          >
            <Unlink />
            Disconnect {label}
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

type DisconnectDialogProps = {
  plugin: Plugin | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

function DisconnectDialog({
  plugin,
  pending,
  onOpenChange,
  onConfirm,
}: DisconnectDialogProps) {
  const name = plugin === "gmail" ? "Gmail" : "Google Calendar";

  return (
    <Dialog open={plugin !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Disconnect {name}?</DialogTitle>
          <DialogDescription>
            On Emit will lose access to this {name} connection and clear its
            local cached integration data. Your data in Google will not be
            deleted, and you can reconnect later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Keep connected
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? <LoaderCircle className="animate-spin" /> : <Unlink />}
            Disconnect {name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
