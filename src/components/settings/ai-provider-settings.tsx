"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronsUpDown, Eye, EyeOff, LoaderCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_PROVIDER_OPTIONS,
  DEFAULT_AI_PROVIDER,
  getAiModelLabel,
  getAiProvider,
  getAiProviderLabel,
  isAiProvider,
  type AiProvider,
} from "@/lib/ai-providers";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/client";

const CUSTOM_MODEL_VALUE = "__custom_model__";

export function AiProviderSettings({ className }: { className?: string }) {
  const utils = api.useUtils();
  const settingsQuery = api.aiSettings.get.useQuery();
  const [provider, setProvider] = useState<AiProvider>(DEFAULT_AI_PROVIDER);
  const [model, setModel] = useState<string>(
    getAiProvider(DEFAULT_AI_PROVIDER).defaultModel,
  );
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showByokForm, setShowByokForm] = useState(false);

  const updateMutation = api.aiSettings.update.useMutation();
  const providerOption = getAiProvider(provider);
  const usesCustomModel = !providerOption.models.some(
    (option) => option.id === model,
  );
  const savedProviders = useMemo(
    () => settingsQuery.data?.savedProviders ?? [],
    [settingsQuery.data?.savedProviders],
  );
  const hasSavedKey = savedProviders.includes(provider);

  async function saveSettings() {
    const trimmedKey = apiKey.trim();
    const trimmedModel = model.trim();

    if (!trimmedKey && !hasSavedKey) {
      toast.error(`Enter your ${providerOption.keyLabel}.`);
      return;
    }
    if (!trimmedModel) {
      toast.error("Enter a model ID.");
      return;
    }

    try {
      const data = await updateMutation.mutateAsync({
        source: "byok",
        provider,
        model: trimmedModel,
        ...(trimmedKey ? { apiKey: trimmedKey } : {}),
      });

      if (data.source !== "byok" || !data.provider || !data.model) {
        throw new Error("The saved provider response was incomplete.");
      }

      setApiKey("");
      setShowApiKey(false);
      setProvider(data.provider);
      setModel(data.model);
      toast.success(`${getAiProviderLabel(data.provider)} is active.`);
      await utils.aiSettings.get.invalidate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save settings.";
      toast.error(message);
    } finally {
      updateMutation.reset();
    }
  }

  async function resetToDefault() {
    try {
      await updateMutation.mutateAsync({
        source: "default",
      });

      setApiKey("");
      setShowApiKey(false);
      setShowByokForm(false);
      toast.success("Switched to built-in AI.");
      await utils.aiSettings.get.invalidate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not reset settings.";
      toast.error(message);
    } finally {
      updateMutation.reset();
    }
  }

  useEffect(() => {
    if (!settingsQuery.data) return;
    if (
      settingsQuery.data.source === "byok" &&
      settingsQuery.data.provider &&
      settingsQuery.data.model
    ) {
      setProvider(settingsQuery.data.provider);
      setModel(settingsQuery.data.model);
      setShowByokForm(true);
      return;
    }

    setShowByokForm(false);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (settingsQuery.error) toast.error(settingsQuery.error.message);
  }, [settingsQuery.error]);

  return (
    <Card className={cn("border-x-0 border-t-0 rounded-none md:rounded-xl md:border", className)}>
      <CardHeader className="border-b p-4 md:p-6">
        <CardTitle>Bring your own key</CardTitle>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {!showByokForm ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Built-in AI is active</p>
              <p className="text-muted-foreground mt-1 text-sm">
                The app manages its provider privately. Add your own key only if
                you want to choose a provider and model.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setShowByokForm(true)}
            >
              Use my own key
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
              <a
                href={providerOption.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary text-sm underline-offset-4 hover:underline"
              >
                {providerOption.keyUrlLabel}
              </a>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="grid content-start gap-2">
                <Label id="ai-provider-label" htmlFor="ai-provider-trigger">
                  Provider
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="ai-provider-trigger"
                    aria-labelledby="ai-provider-label ai-provider-trigger"
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                      />
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{providerOption.label}</span>
                      {hasSavedKey ? (
                        <span className="text-muted-foreground text-xs">
                          Saved
                        </span>
                      ) : null}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-72">
                    <DropdownMenuRadioGroup
                      value={provider}
                      onValueChange={(value) => {
                        if (!isAiProvider(value)) return;
                        const nextProvider = getAiProvider(value);
                        setProvider(value);
                        setModel(nextProvider.defaultModel);
                        setApiKey("");
                      }}
                    >
                      {AI_PROVIDER_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                        >
                          <span className="flex min-w-0 flex-1 items-center justify-between gap-4">
                            <span className="truncate">{option.label}</span>
                            {savedProviders.includes(option.id) ? (
                              <span className="text-muted-foreground text-xs">
                                Saved
                              </span>
                            ) : null}
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid content-start gap-2">
                <Label htmlFor="ai-api-key">{providerOption.keyLabel}</Label>
                <div className="relative">
                  <Input
                    id="ai-api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    className="pr-10"
                    autoComplete="off"
                    placeholder={
                      hasSavedKey
                        ? "Enter a new key to replace the saved key"
                        : providerOption.keyPlaceholder
                    }
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-0.5 right-1"
                    aria-label={showApiKey ? "Hide API key" : "Show API key"}
                    onClick={() => setShowApiKey((visible) => !visible)}
                  >
                    {showApiKey ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>

              <div className="grid content-start gap-2 md:col-span-2 xl:col-span-1">
                <Label id="ai-model-label" htmlFor="ai-model-trigger">
                  Model
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="ai-model-trigger"
                    aria-labelledby="ai-model-label ai-model-trigger"
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between"
                      />
                    }
                  >
                    <span className="truncate">
                      {usesCustomModel
                        ? model || "Custom model ID"
                        : getAiModelLabel(provider, model)}
                    </span>
                    <ChevronsUpDown className="text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="max-h-64 min-w-72 overflow-y-auto"
                  >
                    <DropdownMenuRadioGroup
                      value={usesCustomModel ? CUSTOM_MODEL_VALUE : model}
                      onValueChange={(value) => {
                        if (typeof value !== "string") return;
                        setModel(value === CUSTOM_MODEL_VALUE ? "" : value);
                      }}
                    >
                      {providerOption.models.map((option) => (
                        <DropdownMenuRadioItem
                          key={option.id}
                          value={option.id}
                        >
                          <span className="flex min-w-0 flex-col">
                            <span>{option.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {option.id}
                            </span>
                          </span>
                        </DropdownMenuRadioItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value={CUSTOM_MODEL_VALUE}>
                        Custom model ID
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {usesCustomModel ? (
                  <Input
                    value={model}
                    placeholder="Enter model ID"
                    aria-label="Custom model ID"
                    onChange={(event) => setModel(event.target.value)}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={settingsQuery.isLoading || updateMutation.isPending}
                onClick={() => {
                  if (settingsQuery.data?.source === "byok") {
                    void resetToDefault();
                    return;
                  }
                  setApiKey("");
                  setShowApiKey(false);
                  setShowByokForm(false);
                }}
              >
                {settingsQuery.data?.source === "byok"
                  ? "Reset to built-in"
                  : "Cancel"}
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={settingsQuery.isLoading || updateMutation.isPending}
                onClick={() => void saveSettings()}
              >
                {updateMutation.isPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
