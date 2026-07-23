export const GEMINI_MODEL_OPTIONS = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
  },
  {
    id: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
  },
] as const;

export type GeminiModel = (typeof GEMINI_MODEL_OPTIONS)[number]["id"];

export const DEFAULT_GEMINI_MODEL: GeminiModel = "gemini-2.5-flash";

export function isGeminiModel(value: unknown): value is GeminiModel {
  return GEMINI_MODEL_OPTIONS.some((option) => option.id === value);
}

export function getGeminiModelLabel(model: GeminiModel) {
  return (
    GEMINI_MODEL_OPTIONS.find((option) => option.id === model)?.label ?? model
  );
}
