export function isMissingAiSettingsSchema(error: unknown) {
  let current = error;

  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return false;

    const value = current as {
      cause?: unknown;
      code?: unknown;
      message?: unknown;
    };
    if (value.code === "42P01") return true;
    if (
      typeof value.message === "string" &&
      /relation "corsair_ai_(?:settings|provider_keys)" does not exist/i.test(
        value.message,
      )
    ) {
      return true;
    }

    current = value.cause;
  }

  return false;
}
