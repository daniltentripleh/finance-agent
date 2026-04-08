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

export function createChatSessionId() {
  return crypto.randomUUID();
}

export function getChatSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export async function ensureAnonymousChatSession(
  supabase: any,
  cookieValue: string | null | undefined
) {
  const sessionId = parseChatSessionCookie(cookieValue) ?? createChatSessionId();
  const now = new Date().toISOString();
  const payload = {
    id: sessionId,
    updated_at: now,
    last_active_at: now,
  };

  const { error } = await supabase.from("chat_sessions").upsert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return sessionId;
}
