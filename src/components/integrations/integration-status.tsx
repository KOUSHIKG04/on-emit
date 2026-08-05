"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  ChevronsUpDown,
  ChevronRight,
  CircleAlert,
  Copy,
  LoaderCircle,
  Mail,
  Plus,
  RefreshCw,
  Trash2,
  Unlink,
  UserRound,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/trpc/client";
import { cn } from "@/lib/utils";

type ConnectionState = "connected" | "missing_credentials" | "not_connected";
type ConnectablePlugin = "gmail" | "googlecalendar";

type Service = {
  plugin: ConnectablePlugin;
  name: string;
  icon: React.ReactNode;
  state: ConnectionState;
};

export function IntegrationStatus({ className }: { className?: string }) {
  const utils = api.useUtils();
  const [redirectingConnection, setRedirectingConnection] = useState<
    string | null
  >(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [disconnectDialogPlugin, setDisconnectDialogPlugin] =
    useState<ConnectablePlugin | null>(null);

  const statusQuery = api.integrations.status.useQuery(undefined, {
    refetchOnWindowFocus: true,
  });
  const webhookQuery = api.integrations.webhookConfig.useQuery();

  const connectMutation = api.integrations.connect.useMutation({
    onSuccess(data, variables) {
      setRedirectingConnection(
        `${variables.accountId ?? "active"}:${variables.plugin}`,
      );
      window.location.assign(data.connectUrl);
    },
    onError(error) {
      setRedirectingConnection(null);
      toast.error(error.message);
    },
  });

  const createAccountMutation =
    api.integrations.createGoogleAccount.useMutation({
      async onSuccess(account) {
        await utils.integrations.status.invalidate();
        connectMutation.mutate({ plugin: "gmail", accountId: account.id });
      },
      onError(error) {
        toast.error(error.message);
      },
    });

  const selectAccountMutation =
    api.integrations.selectGoogleAccount.useMutation({
      async onSuccess() {
        await Promise.all([
          utils.integrations.invalidate(),
          utils.gmail.invalidate(),
          utils.calendar.invalidate(),
          utils.account.invalidate(),
        ]);
        toast.success("Active Google account changed.");
      },
      onError(error) {
        toast.error(error.message);
      },
    });

  const removeAccountMutation =
    api.integrations.removeGoogleAccount.useMutation({
      async onSuccess() {
        setRemoveDialogOpen(false);
        await Promise.all([
          utils.integrations.invalidate(),
          utils.gmail.invalidate(),
          utils.calendar.invalidate(),
          utils.account.invalidate(),
        ]);
        toast.success("Google account removed.");
      },
      onError(error) {
        toast.error(error.message);
      },
    });

  const disconnectMutation = api.integrations.disconnect.useMutation({
    async onSuccess(_, variables) {
      const name = variables.plugin === "gmail" ? "Gmail" : "Google Calendar";
      setDisconnectDialogPlugin(null);
      await Promise.all([
        utils.integrations.status.invalidate(),
        variables.plugin === "gmail"
          ? utils.gmail.invalidate()
          : utils.calendar.invalidate(),
      ]);
      toast.success(`${name} disconnected.`);
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (statusQuery.data) setRedirectingConnection(null);
  }, [statusQuery.data]);

  useEffect(() => {
    if (statusQuery.error) toast.error(statusQuery.error.message);
  }, [statusQuery.error]);

  useEffect(() => {
    if (webhookQuery.error) toast.error(webhookQuery.error.message);
  }, [webhookQuery.error]);

  const activeAccount = statusQuery.data?.accounts.find(
    (account) => account.id === statusQuery.data.activeAccountId,
  );
  const services: Service[] = activeAccount
    ? [
        {
          plugin: "gmail",
          name: "Gmail",
          icon: <Mail className="size-5" />,
          state: activeAccount.gmail,
        },
        {
          plugin: "googlecalendar",
          name: "Google Calendar",
          icon: <CalendarDays className="size-5" />,
          state: activeAccount.googleCalendar,
        },
      ]
    : [];

  function connect(plugin: ConnectablePlugin) {
    if (!activeAccount) return;
    const connection = `${activeAccount.id}:${plugin}`;
    setRedirectingConnection(connection);
    connectMutation.mutate({ plugin, accountId: activeAccount.id });
  }

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 border-x-0 border-t-0 rounded-none md:rounded-xl md:border",
        className,
      )}
    >
      <CardHeader className="border-b p-4 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <CardTitle>Google accounts</CardTitle>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center xl:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full min-w-0 justify-between sm:min-w-60 xl:flex-none"
                    disabled={
                      statusQuery.isLoading || selectAccountMutation.isPending
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <UserRound className="size-4 shrink-0" />
                      <span className="truncate">
                        {activeAccount?.label ?? "Choose Google account"}
                      </span>
                    </span>
                    {selectAccountMutation.isPending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="size-4 opacity-60" />
                    )}
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-64">
                <DropdownMenuLabel>Active Google account</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={statusQuery.data?.activeAccountId}
                  onValueChange={(accountId) => {
                    if (
                      typeof accountId === "string" &&
                      accountId !== statusQuery.data?.activeAccountId
                    ) {
                      selectAccountMutation.mutate({ accountId });
                    }
                  }}
                >
                  {statusQuery.data?.accounts.map((account) => (
                    <DropdownMenuRadioItem
                      key={account.id}
                      value={account.id}
                      className="py-2"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{account.label}</span>
                        <span className="text-muted-foreground text-xs">
                          Gmail {connectionSummary(account.gmail)} · Calendar{" "}
                          {connectionSummary(account.googleCalendar)}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>
                  Each account keeps separate OAuth connections.
                </DropdownMenuLabel>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                className="flex-1 sm:w-auto"
                disabled={
                  createAccountMutation.isPending || connectMutation.isPending
                }
                onClick={() => createAccountMutation.mutate({})}
              >
                {createAccountMutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <Plus />
                )}
                Add account
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={statusQuery.isFetching}
                aria-label="Refresh connection status"
                onClick={() => void statusQuery.refetch()}
              >
                <RefreshCw
                  className={
                    statusQuery.isFetching ? "animate-spin" : undefined
                  }
                />
              </Button>

              {activeAccount && activeAccount.id !== "legacy" ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  disabled={removeAccountMutation.isPending}
                  aria-label={`Remove ${activeAccount.label}`}
                  title={`Remove ${activeAccount.label}`}
                  onClick={() => setRemoveDialogOpen(true)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 md:p-6">
        {statusQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Checking Corsair connections...
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-2">
          {services.map((service) => (
            <ConnectionRow
              key={service.plugin}
              service={service}
              isConnecting={
                redirectingConnection ===
                  `${activeAccount?.id}:${service.plugin}` ||
                (connectMutation.isPending &&
                  connectMutation.variables?.plugin === service.plugin &&
                  connectMutation.variables.accountId === activeAccount?.id)
              }
              isDisconnecting={
                disconnectMutation.isPending &&
                disconnectMutation.variables?.plugin === service.plugin
              }
              onConnect={() => connect(service.plugin)}
              onDisconnect={() => setDisconnectDialogPlugin(service.plugin)}
            />
          ))}
        </div>

        {webhookQuery.isLoading ? (
          <div className="text-muted-foreground flex items-center gap-2 rounded-xl border p-4 text-sm">
            <LoaderCircle className="size-4 animate-spin" />
            Preparing protected webhook endpoint...
          </div>
        ) : null}

        {webhookQuery.data ? (
          <Collapsible className="w-full rounded-lg border">
            <CollapsibleTrigger className="group flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
              <span>Realtime webhook endpoint</span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-data-panel-open:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="w-full">
              <div className="flex w-full flex-col gap-2 border-t p-3 sm:flex-row sm:items-center">
                <code className="bg-muted text-muted-foreground min-w-0 flex-1 rounded-md px-3 py-2 text-xs break-all">
                  {webhookQuery.data.url}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 sm:w-auto"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        webhookQuery.data.url,
                      );
                      toast.success("Webhook URL copied.");
                    } catch {
                      toast.error(
                        "Could not copy the webhook URL. Select and copy it manually.",
                      );
                    }
                  }}
                >
                  <Copy />
                  Copy
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </CardContent>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Google account?</DialogTitle>
            <DialogDescription>
              This removes the selected Gmail and Calendar connections from On
              Emit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removeAccountMutation.isPending}
              onClick={() => setRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!activeAccount || removeAccountMutation.isPending}
              onClick={() => {
                if (!activeAccount) return;
                removeAccountMutation.mutate({ accountId: activeAccount.id });
              }}
            >
              {removeAccountMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              Remove account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={disconnectDialogPlugin !== null}
        onOpenChange={(open) => {
          if (!open && !disconnectMutation.isPending) {
            setDisconnectDialogPlugin(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Disconnect{" "}
              {disconnectDialogPlugin === "gmail" ? "Gmail" : "Google Calendar"}
              ?
            </DialogTitle>
            <DialogDescription>
              On Emit will lose access to this connection and clear its local
              cached integration data. Your email and calendar data in Google
              will not be deleted, and you can reconnect later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={disconnectMutation.isPending}
              onClick={() => setDisconnectDialogPlugin(null)}
            >
              Keep connected
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                !activeAccount ||
                !disconnectDialogPlugin ||
                disconnectMutation.isPending
              }
              onClick={() => {
                if (!activeAccount || !disconnectDialogPlugin) return;
                disconnectMutation.mutate({
                  plugin: disconnectDialogPlugin,
                  accountId: activeAccount.id,
                });
              }}
            >
              {disconnectMutation.isPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Unlink />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function connectionSummary(state: ConnectionState) {
  if (state === "connected") return "connected";
  if (state === "missing_credentials") return "needs setup";
  return "not connected";
}

type ConnectionRowProps = {
  service: Service;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

function ConnectionRow({
  service,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: ConnectionRowProps) {
  const isConnected = service.state === "connected";
  const isMissingCredentials = service.state === "missing_credentials";

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          {service.icon}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{service.name}</p>
            <ConnectionBadge state={service.state} />
          </div>
        </div>
      </div>

      <div className="flex w-full shrink-0 gap-2 sm:w-auto">
        <Button
          type="button"
          variant={isConnected ? "outline" : "default"}
          disabled={isConnecting || isDisconnecting || isMissingCredentials}
          className="flex-1 sm:min-w-28"
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
        {isConnected ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={isConnecting || isDisconnecting}
            aria-label={`Disconnect ${service.name}`}
            title={`Disconnect ${service.name}`}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDisconnect}
          >
            {isDisconnecting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Unlink />
            )}
          </Button>
        ) : null}
      </div>
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
