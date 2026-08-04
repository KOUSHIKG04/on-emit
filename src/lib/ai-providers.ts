export const AI_PROVIDER_OPTIONS = [
  {
    id: "gemini",
    label: "Google Gemini",
    keyLabel: "Gemini API key",
    keyPlaceholder: "Enter your Google AI Studio key",
    keyUrl: "https://aistudio.google.com/apikey",
    keyUrlLabel: "Get a Gemini API key",
    defaultModel: "gemini-3.5-flash-lite",
    models: [
      {
        id: "gemini-3.6-flash",
        label: "Gemini 3.6 Flash",
        agentFallbackPriority: 1,
      },
      {
        id: "gemini-3.5-flash",
        label: "Gemini 3.5 Flash",
        agentFallbackPriority: 2,
      },
      {
        id: "gemini-3.5-flash-lite",
        label: "Gemini 3.5 Flash Lite",
        agentFallbackPriority: 3,
      },
      {
        id: "gemini-3.1-flash-lite",
        label: "Gemini 3.1 Flash Lite",
        agentFallbackPriority: 4,
      },
      { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        agentFallbackPriority: 5,
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash Lite",
        agentFallbackPriority: 6,
        // Remove from fallbacks when Google retires it on 2026-10-16.
      },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    keyLabel: "OpenRouter API key",
    keyPlaceholder: "Enter your OpenRouter key",
    keyUrl: "https://openrouter.ai/settings/keys",
    keyUrlLabel: "Get an OpenRouter API key",
    defaultModel: "openrouter/auto",
    models: [{ id: "openrouter/auto", label: "OpenRouter Auto" }],
  },
  {
    id: "openai",
    label: "OpenAI",
    keyLabel: "OpenAI API key",
    keyPlaceholder: "Enter your OpenAI key",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "Get an OpenAI API key",
    defaultModel: "gpt-4o-mini",
    models: [
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "gpt-4o", label: "GPT-4o" },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    keyLabel: "Claude API key",
    keyPlaceholder: "Enter your Anthropic key",
    keyUrl: "https://platform.claude.com/settings/keys",
    keyUrlLabel: "Get an Anthropic API key",
    defaultModel: "claude-3-5-haiku-latest",
    models: [
      { id: "claude-3-5-haiku-latest", label: "Claude 3.5 Haiku" },
      { id: "claude-3-5-sonnet-latest", label: "Claude 3.5 Sonnet" },
    ],
  },
] as const;

export type AiProvider = (typeof AI_PROVIDER_OPTIONS)[number]["id"];

export const DEFAULT_AI_PROVIDER: AiProvider = "gemini";

export function isAiProvider(value: unknown): value is AiProvider {
  return AI_PROVIDER_OPTIONS.some((provider) => provider.id === value);
}

export function getAiProvider(provider: AiProvider) {
  return AI_PROVIDER_OPTIONS.find((option) => option.id === provider)!;
}

export function getAiProviderLabel(provider: AiProvider) {
  return getAiProvider(provider).label;
}

export function getDefaultAiModel(provider: AiProvider) {
  return getAiProvider(provider).defaultModel;
}

export function getAiModelLabel(provider: AiProvider, model: string) {
  return (
    getAiProvider(provider).models.find((option) => option.id === model)
      ?.label ?? model
  );
}

export const GEMINI_AGENT_FALLBACK_MODELS = getAiProvider("gemini")
  .models.flatMap((model) =>
    "agentFallbackPriority" in model
      ? [{ id: model.id, priority: model.agentFallbackPriority }]
      : [],
  )
  .sort((left, right) => left.priority - right.priority)
  .map((model) => model.id);

export function normalizeLegacyAiModel(provider: AiProvider, model: string) {
  return provider === "gemini" &&
    /^(?:models\/)?gemini-2\.0-flash(?:-lite)?$/i.test(model)
    ? getDefaultAiModel("gemini")
    : model;
}
