import {
  buildConversationPrompt,
  normalizePrompt,
  resolveRuntimeApiKey,
} from "@/lib/agent-config";
import { runClaudeAgentInSandbox } from "@/lib/claude-agent-sandbox";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const { prompt, messages, apiKey, model } = await req.json();
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
    const normalizedPrompt = Array.isArray(messages)
      ? buildConversationPrompt(messages)
      : normalizePrompt(prompt);
    const normalizedModel =
      typeof model === "string" && model.trim() ? model.trim() : undefined;
    const result = await runClaudeAgentInSandbox(
      normalizedPrompt,
      key,
      normalizedModel
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
