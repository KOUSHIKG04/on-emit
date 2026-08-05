export const ACTION_PREVIEW_PATTERN =
  /^(?:I will|I'll)\s+(?:add|archive|cancel|compose|create|delete|draft|forward|invite|mark|modify|move|remove|reply|reschedule|save|schedule|send|trash|untrash|update)\b/i;

export function isActionPreview(message: string): boolean {
  return ACTION_PREVIEW_PATTERN.test(message.trimStart());
}
