export const CHAT_SESSION_COOKIE_NAME = "finance_agent_chat_session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSessionId(value: string | null | undefined) {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

export function parseChatSessionCookie(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !isValidSessionId(trimmed)) {
    return null;
  }

  return trimmed;
}
