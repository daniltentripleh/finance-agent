import { cookies } from "next/headers";
import { markAttachmentUploaded } from "@/lib/chat-attachments";
import {
  CHAT_SESSION_COOKIE_NAME,
  parseChatSessionCookie,
} from "@/lib/chat-session";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { attachmentId } = await req.json();
  const cookieStore = await cookies();
  const sessionId = parseChatSessionCookie(
    cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value
  );

  if (!sessionId) {
    return new Response(
      JSON.stringify({ error: "A chat session is required before uploads can complete." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createSupabaseAdminClient();
  const attachment = await markAttachmentUploaded(supabase, {
    attachmentId,
    sessionId,
  });

  return Response.json({ attachment });
}
