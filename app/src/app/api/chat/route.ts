import {
  buildConversationPrompt,
  normalizePrompt,
  resolveRuntimeApiKey,
} from "@/lib/agent-config";
import { cookies } from "next/headers";
import { resolveRuntimeAttachments } from "@/lib/chat-attachment-runtime";
import {
  CHAT_SESSION_COOKIE_NAME,
  parseChatSessionCookie,
} from "@/lib/chat-session";
import { runClaudeAgentInSandbox } from "@/lib/claude-agent-sandbox";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { prompt, messages, apiKey, model, attachmentIds } = await req.json();
  const key = resolveRuntimeApiKey({
    serverApiKey: process.env.ANTHROPIC_API_KEY,
    browserApiKey: apiKey,
  });

  if (!key) {
    return new Response(
      JSON.stringify({
        error:
          "No API key. Set ANTHROPIC_API_KEY in Vercel or enter a browser API key in settings.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const cookieStore = await cookies();
    const sessionId = parseChatSessionCookie(
      cookieStore.get(CHAT_SESSION_COOKIE_NAME)?.value
    );
    const normalizedAttachmentIds = Array.isArray(attachmentIds)
      ? attachmentIds.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0
        )
      : [];
    const attachments =
      sessionId && normalizedAttachmentIds.length > 0
        ? await resolveRuntimeAttachments(createSupabaseAdminClient(), {
            sessionId,
            attachmentIds: normalizedAttachmentIds,
          })
        : [];
    const normalizedPrompt = Array.isArray(messages)
      ? buildConversationPrompt(messages, attachments)
      : normalizePrompt(prompt);
    const normalizedModel =
      typeof model === "string" && model.trim() ? model.trim() : undefined;
    const result = await runClaudeAgentInSandbox(
      normalizedPrompt,
      key,
      normalizedModel,
      attachments
    );

    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Claude Agent SDK request failed.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
