import { cookies } from "next/headers";
import { deleteAttachmentForSession } from "@/lib/chat-attachments";
import {
  CHAT_SESSION_COOKIE_NAME,
  parseChatSessionCookie,
} from "@/lib/chat-session";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ attachmentId: string }> }
) {
  const cookieStore = await cookies();
  const sessionId = parseChatSessionCookie(
    cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value
  );

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "A chat session is required before attachments can be removed." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const { attachmentId } = await context.params;
  const supabase = createSupabaseAdminClient();
  await deleteAttachmentForSession(supabase, {
    attachmentId,
    sessionId,
  });

  return new Response(null, { status: 204 });
}
