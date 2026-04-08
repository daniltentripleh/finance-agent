import { cookies } from "next/headers";
import {
  CHAT_SESSION_COOKIE_NAME,
  ensureAnonymousChatSession,
  getChatSessionCookieOptions,
} from "@/lib/chat-session";
import { listActiveAttachmentsForSession } from "@/lib/chat-attachments";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createSupabaseAdminClient();
  const sessionId = await ensureAnonymousChatSession(
    supabase,
    cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value
  );
  const attachments = await listActiveAttachmentsForSession(supabase, sessionId);

  cookieStore.set(CHAT_SESSION_COOKIE_NAME, sessionId, getChatSessionCookieOptions());

  return Response.json({ sessionId, attachments });
}
