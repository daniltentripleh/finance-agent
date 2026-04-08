import { cookies } from "next/headers";
import {
  createSignedUploadForAttachment,
} from "@/lib/chat-attachments";
import {
  CHAT_SESSION_COOKIE_NAME,
  ensureAnonymousChatSession,
  getChatSessionCookieOptions,
} from "@/lib/chat-session";
import { getSupabaseServerEnvFromProcess } from "@/lib/supabase-env";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { fileName, contentType, byteSize } = await req.json();
  const cookieStore = await cookies();
  const supabase = createSupabaseAdminClient();
  const env = getSupabaseServerEnvFromProcess();
  const sessionId = await ensureAnonymousChatSession(
    supabase,
    cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value
  );

  const result = await createSignedUploadForAttachment(supabase, {
    sessionId,
    attachmentId: crypto.randomUUID(),
    bucket: env.attachmentsBucket,
    originalName: fileName,
    mimeType: contentType,
    byteSize,
  });

  cookieStore.set(CHAT_SESSION_COOKIE_NAME, sessionId, getChatSessionCookieOptions());

  return Response.json({
    sessionId,
    bucket: env.attachmentsBucket,
    ...result,
  });
}
