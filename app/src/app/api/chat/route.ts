import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, apiKey } = await req.json();

  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ error: "No API key. Enter your Anthropic API key in settings." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const anthropic = createAnthropic({ apiKey: key });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: SYSTEM_PROMPT,
    messages,
    maxTokens: 8192,
  });

  return result.toDataStreamResponse();
}
