"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Sparkles,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_GEMINI_MODEL,
  GEMINI_MODEL_OPTIONS,
  getGeminiModelLabel,
  isGeminiModel,
  type GeminiModel,
} from "@/lib/gemini";
import { api } from "@/trpc/client";

type KeySource = "default" | "byok";

export function AiProviderSettings() {
  const utils = api.useUtils();
  const settingsQuery = api.aiSettings.get.useQuery();
  const [source, setSource] = useState<KeySource>("default");
  const [model, setModel] = useState<GeminiModel>(DEFAULT_GEMINI_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  const updateMutation = api.aiSettings.update.useMutation();

  async function saveSettings() {
    const trimmedKey = apiKey.trim();
    if (source === "default" && !settingsQuery.data?.hasDefaultKey) {
      toast.error("No app Gemini key is configured. Use your own key.");
      return;
    }
    if (
      source === "byok" &&
      !trimmedKey &&
      !settingsQuery.data?.hasPrivateKey
    ) {
      toast.error("Enter your Gemini API key.");
      return;
    }

    try {
      const data = await updateMutation.mutateAsync({
        source,
        model,
        ...(trimmedKey ? { apiKey: trimmedKey } : {}),
      });
      setApiKey("");
      setSource(data.source);
      setModel(data.model);
      toast.success(
        data.source === "byok"
          ? "Your Gemini key is active."
          : "The app Gemini key is active.",
      );
      void utils.aiSettings.get.invalidate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save settings.";
      toast.error(message);
    } finally {
      updateMutation.reset();
    }
  }

  useEffect(() => {
    if (!settingsQuery.data) return;
    setSource(settingsQuery.data.source);
    setModel(settingsQuery.data.model);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.error) toast.error(settingsQuery.error.message);
  }, [settingsQuery.error]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle>Agent model</CardTitle>
            <CardDescription>
              Google Gemini is the default provider for Corsair agent chats.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <Label>API key source</Label>
          <Tabs
            value={source}
            onValueChange={(value) => {
              const nextSource = value as KeySource;
              setSource(nextSource);
              if (nextSource === "default") {
                setModel(
                  settingsQuery.data?.defaultModel ?? DEFAULT_GEMINI_MODEL,
                );
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2 sm:w-80">
              <TabsTrigger
                value="default"
                disabled={Boolean(
                  settingsQuery.data && !settingsQuery.data.hasDefaultKey,
                )}
              >
                App key
              </TabsTrigger>
              <TabsTrigger value="byok">Bring your own key</TabsTrigger>
            </TabsList>

            <TabsContent value="default" className="pt-2">
              <div className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm">
                {settingsQuery.data?.hasDefaultKey ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : (
                  <KeyRound className="text-muted-foreground size-4 shrink-0" />
                )}
                <span>
                  {settingsQuery.data?.hasDefaultKey
                    ? "The app Gemini key is configured."
                    : "No app Gemini key is configured."}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="byok" className="space-y-2 pt-2">
              <Label htmlFor="gemini-api-key">Gemini API key</Label>
              <div className="relative max-w-xl">
                <Input
                  id="gemini-api-key"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  className="pr-10"
                  autoComplete="off"
                  placeholder={
                    settingsQuery.data?.hasPrivateKey
                      ? "Private key saved - enter a new key to replace it"
                      : "Enter your Gemini API key"
                  }
                  onChange={(event) => setApiKey(event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-0.5 right-1"
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                  title={showApiKey ? "Hide API key" : "Show API key"}
                  onClick={() => setShowApiKey((visible) => !visible)}
                >
                  {showApiKey ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {settingsQuery.data?.hasPrivateKey ? (
                <p className="text-muted-foreground text-xs">
                  An encrypted private key is already saved.
                </p>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>

        <div className="grid max-w-xl gap-2">
          <Label>Model</Label>
          {source === "byok" ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                  />
                }
              >
                {getGeminiModelLabel(model)}
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-64">
                <DropdownMenuRadioGroup
                  value={model}
                  onValueChange={(value) => {
                    if (isGeminiModel(value)) setModel(value);
                  }}
                >
                  {GEMINI_MODEL_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem key={option.id} value={option.id}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled
            >
              Default model
              <ChevronDown />
            </Button>
          )}
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button
            type="button"
            disabled={settingsQuery.isLoading || updateMutation.isPending}
            onClick={() => void saveSettings()}
          >
            {updateMutation.isPending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <KeyRound />
            )}
            Save agent settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
