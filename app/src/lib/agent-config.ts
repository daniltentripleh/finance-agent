export type ApiKeyMode = "server" | "browser" | "missing";

export interface ApiKeySources {
  serverApiKey?: string | null;
  browserApiKey?: string | null;
}

export interface PromptMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PromptAttachment {
  id: string;
  originalName: string;
  sandboxPath: string;
}

function normalizeKey(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveRuntimeApiKey({
  serverApiKey,
  browserApiKey,
}: ApiKeySources) {
  return normalizeKey(serverApiKey) ?? normalizeKey(browserApiKey);
}

export function getApiKeyMode({
  serverApiKey,
  browserApiKey,
}: ApiKeySources): ApiKeyMode {
  if (normalizeKey(serverApiKey)) return "server";
  if (normalizeKey(browserApiKey)) return "browser";
  return "missing";
}

export function normalizePrompt(prompt: string) {
  const normalized = prompt.trim();
  if (!normalized) {
    throw new Error("Prompt is required.");
  }

  return normalized;
}

export function buildConversationPrompt(
  messages: PromptMessage[],
  attachments: PromptAttachment[] = []
) {
  const transcript = messages
    .map((message) => {
      const normalizedContent = message.content.trim();
      if (!normalizedContent) return null;

      return `${message.role === "user" ? "User" : "Assistant"}: ${normalizedContent}`;
    })
    .filter((message): message is string => Boolean(message))
    .join("\n\n");

  const attachmentBlock =
    attachments.length > 0
      ? `Attached files:\n${attachments
          .map(
            (attachment) =>
              `- ${attachment.originalName} => ${attachment.sandboxPath}`
          )
          .join("\n")}\n\n`
      : "";

  return normalizePrompt(`${attachmentBlock}${transcript}`);
}
