"use client";

import { CalendarDays, CheckCircle2, LoaderCircle, Mail } from "@/components/icons";
import type { TablerIcon } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";

type Plugin = "gmail" | "googlecalendar";

export function IntegrationActions() {
  const status = api.integrations.status.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const connect = api.integrations.connect.useMutation({
    onSuccess(data) {
      window.location.assign(data.connectUrl);
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
          (connect.isPending &&
            connect.variables?.plugin === "googlecalendar")
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
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={loading}
      aria-label={connected ? `Reconnect ${label}` : `Connect ${label}`}
      onClick={onClick}
    >
      {loading ? <LoaderCircle className="animate-spin" /> : <Icon />}
      <span className="hidden xl:inline">
        {connected ? label : `Connect ${label}`}
      </span>
      {connected ? (
        <CheckCircle2 className="hidden size-3.5 text-emerald-500 xl:block" />
      ) : null}
    </Button>
  );
}
