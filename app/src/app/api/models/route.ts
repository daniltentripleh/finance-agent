import { resolveRuntimeApiKey } from "@/lib/agent-config";
import { fetchAnthropicModels } from "@/lib/anthropic-models";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { apiKey } = await req.json();
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
    const models = await fetchAnthropicModels(key);
    return Response.json({ models });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load Anthropic models.";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
