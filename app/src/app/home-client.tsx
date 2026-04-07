"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getApiKeyMode } from "@/lib/agent-config";
import {
  pickDefaultModelId,
  type ChatModelOption,
} from "@/lib/anthropic-models";
import { COMMANDS, CATEGORIES, type Command } from "@/lib/commands";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelId?: string;
}

function useApiKey() {
  const [apiKey, setApiKeyState] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key") ?? "";
    setApiKeyState(stored);
    setLoaded(true);
  }, []);

  function setApiKey(key: string) {
    setApiKeyState(key);

    if (key) {
      localStorage.setItem("anthropic_api_key", key);
    } else {
      localStorage.removeItem("anthropic_api_key");
    }
  }

  return { apiKey, setApiKey, loaded };
}

function SettingsModal({
  apiKey,
  serverHasApiKey,
  onSave,
  onClose,
}: {
  apiKey: string;
  serverHasApiKey: boolean;
  onSave: (key: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(apiKey);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-6">
        <h2 className="mb-1 font-bold text-[var(--color-terminal-green)]">
          Browser API Key
        </h2>
        <p className="mb-4 text-xs text-[var(--color-terminal-muted)]">
          {serverHasApiKey
            ? "Optional override. Your deployment already has a server-side Anthropic key."
            : "Enter your Anthropic API key. Stored locally in your browser only."}
        </p>
        <input
          ref={inputRef}
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="sk-ant-..."
          className="mb-4 w-full rounded border border-[var(--color-terminal-border)] bg-[var(--color-terminal-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-terminal-accent)]"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onSave(draft);
              onClose();
            }
          }}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-[var(--color-terminal-border)] px-3 py-1.5 text-xs text-[var(--color-terminal-muted)] transition-colors hover:text-[var(--color-terminal-text)]"
          >
            Cancel
          </button>
          {apiKey && (
            <button
              onClick={() => {
                onSave("");
                onClose();
              }}
              className="rounded border border-[var(--color-terminal-red)] px-3 py-1.5 text-xs text-[var(--color-terminal-red)] transition-colors hover:bg-[var(--color-terminal-red)] hover:text-[var(--color-terminal-bg)]"
            >
              Remove
            </button>
          )}
          <button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="rounded bg-[var(--color-terminal-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-terminal-bg)] transition-opacity hover:opacity-90"
          >
            Save
          </button>
        </div>
        <p className="mt-3 text-[10px] text-[var(--color-terminal-muted)]">
          Your browser key is only used when the deployment does not already
          provide a server-side key.
        </p>
      </div>
    </div>
  );
}

function CommandPalette({
  filter,
  onSelect,
  visible,
}: {
  filter: string;
  onSelect: (cmd: Command) => void;
  visible: boolean;
}) {
  const filtered = useMemo(() => {
    if (!filter) return COMMANDS.slice(0, 10);
    const query = filter.toLowerCase();
    return COMMANDS.filter(
      (command) =>
        command.name.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query) ||
        command.category.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [filter]);

  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] shadow-2xl">
      {filtered.map((command) => (
        <button
          key={command.name}
          onClick={() => onSelect(command)}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--color-terminal-border)]"
        >
          <span className="min-w-[160px] text-sm font-semibold text-[var(--color-terminal-accent)]">
            {command.name}
          </span>
          <span className="flex-1 text-xs text-[var(--color-terminal-muted)]">
            {command.description}
          </span>
          <span className="text-xs text-[var(--color-terminal-border)]">
            {command.category}
          </span>
        </button>
      ))}
    </div>
  );
}

function WelcomeScreen({ onCommand }: { onCommand: (text: string) => void }) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-10 text-center">
          <div className="mb-3 text-4xl font-bold text-[var(--color-terminal-green)]">
            $ finance-agent
          </div>
          <p className="text-sm text-[var(--color-terminal-muted)]">
            Financial analysis powered by Claude&apos;s Agent SDK in Vercel
            Sandbox
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {CATEGORIES.map((category) => (
            <div
              key={category}
              className="rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-4"
            >
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-terminal-accent)]">
                {category}
              </h3>
              <div className="space-y-1.5">
                {COMMANDS.filter((command) => command.category === category)
                  .slice(0, 4)
                  .map((command) => (
                    <button
                      key={command.name}
                      onClick={() =>
                        onCommand(
                          `${command.name}${command.hint ? ` ${command.hint}` : ""}`
                        )
                      }
                      className="block w-full py-0.5 text-left text-xs transition-colors hover:text-[var(--color-terminal-accent)]"
                    >
                      <span className="text-[var(--color-terminal-green)]">
                        {command.name}
                      </span>{" "}
                      <span className="text-[var(--color-terminal-muted)]">
                        {command.description}
                      </span>
                    </button>
                  ))}
                {COMMANDS.filter((command) => command.category === category).length >
                  4 && (
                  <span className="text-xs text-[var(--color-terminal-border)]">
                    +
                    {COMMANDS.filter((command) => command.category === category)
                      .length - 4}{" "}
                    more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-[var(--color-terminal-muted)]">
          Choose a model for each message, then run any finance command.
        </p>
      </div>
    </div>
  );
}

function createChatMessage(
  role: ChatMessage["role"],
  content: string,
  modelId?: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    modelId,
  };
}

function formatModelLabel(modelId?: string) {
  return modelId ? modelId : "model pending";
}

export default function HomeClient({
  serverHasApiKey,
}: {
  serverHasApiKey: boolean;
}) {
  const { apiKey, setApiKey, loaded } = useApiKey();
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiKeyMode = getApiKeyMode({
    serverApiKey: serverHasApiKey ? "configured" : "",
    browserApiKey: apiKey,
  });
  const hasAnyKey = apiKeyMode !== "missing";
  const canSend = hasAnyKey && Boolean(selectedModelId) && !isLoadingModels;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (loaded && !serverHasApiKey && !apiKey) {
      setShowSettings(true);
    }
  }, [apiKey, loaded, serverHasApiKey]);

  useEffect(() => {
    if (!serverHasApiKey && !loaded) return;

    if (!serverHasApiKey && !apiKey) {
      setModels([]);
      setSelectedModelId("");
      setModelsError(null);
      setIsLoadingModels(false);
      return;
    }

    let cancelled = false;

    async function loadModels() {
      setIsLoadingModels(true);
      setModelsError(null);

      try {
        const response = await fetch("/api/models", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            apiKey: apiKey || undefined,
          }),
        });

        const data = (await response.json()) as {
          models?: ChatModelOption[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Failed to load models.");
        }

        const nextModels = data.models ?? [];
        if (cancelled) return;

        setModels(nextModels);
        setSelectedModelId((current) =>
          pickDefaultModelId(nextModels, current) ?? ""
        );
      } catch (caughtError) {
        if (cancelled) return;

        setModels([]);
        setSelectedModelId("");
        setModelsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load models."
        );
      } finally {
        if (!cancelled) {
          setIsLoadingModels(false);
        }
      }
    }

    void loadModels();

    return () => {
      cancelled = true;
    };
  }, [apiKey, loaded, serverHasApiKey]);

  const paletteFilter = input.startsWith("/") ? input.slice(1) : "";

  async function sendPrompt(promptValue: string) {
    const trimmedPrompt = promptValue.trim();
    if (!trimmedPrompt || isLoading) return;

    if (!hasAnyKey) {
      setShowSettings(true);
      return;
    }

    if (!selectedModelId) {
      setModelsError("Choose a model before sending a message.");
      return;
    }

    const userMessage = createChatMessage("user", trimmedPrompt, selectedModelId);
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setShowPalette(false);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          apiKey: apiKey || undefined,
          model: selectedModelId,
        }),
      });

      const data = (await response.json()) as {
        result?: string;
        error?: string;
        model?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }

      setMessages((current) => [
        ...current,
        createChatMessage("assistant", data.result || "", data.model || selectedModelId),
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "An error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleCommandSelect(command: Command) {
    setInput(`${command.name} `);
    setShowPalette(false);
    inputRef.current?.focus();
  }

  function handleCommand(text: string) {
    void sendPrompt(text);
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
    setShowPalette(event.target.value.startsWith("/"));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendPrompt(input);
  }

  const statusText =
    apiKeyMode === "server"
      ? isLoading
        ? "thinking..."
        : "server key"
      : apiKeyMode === "browser"
        ? isLoading
          ? "thinking..."
          : "browser key"
        : "no key";

  const statusDotClass =
    apiKeyMode === "missing"
      ? "bg-[var(--color-terminal-red)]"
      : isLoading
        ? "animate-pulse bg-[var(--color-terminal-amber)]"
        : "bg-[var(--color-terminal-green)]";

  const modelStatus = isLoadingModels
    ? "Loading models..."
    : models.length > 0
      ? `${models.length} models`
      : "No models";

  return (
    <div className="flex h-screen flex-col">
      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          serverHasApiKey={serverHasApiKey}
          onSave={setApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--color-terminal-green)]">
            $
          </span>
          <span className="font-semibold">finance-agent</span>
          <span className="rounded border border-[var(--color-terminal-border)] px-2 py-0.5 text-xs text-[var(--color-terminal-muted)]">
            claude-agent-sdk
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--color-terminal-muted)]">
          <span>{modelStatus}</span>
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-1.5 transition-colors hover:text-[var(--color-terminal-text)] ${
              apiKeyMode === "missing"
                ? "text-[var(--color-terminal-red)]"
                : ""
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
            {statusText}
          </button>
        </div>
      </header>

      {(error || modelsError) && (
        <div className="border-b border-[var(--color-terminal-red)]/30 bg-[var(--color-terminal-red)]/10 px-6 py-2 text-xs text-[var(--color-terminal-red)]">
          {error || modelsError}
        </div>
      )}

      {messages.length === 0 ? (
        <WelcomeScreen onCommand={handleCommand} />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {messages.map((message) => (
              <div key={message.id}>
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 min-w-[60px] text-xs font-bold ${
                      message.role === "user"
                        ? "text-[var(--color-terminal-green)]"
                        : "text-[var(--color-terminal-accent)]"
                    }`}
                  >
                    {message.role === "user" ? "you >" : "agent >"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2">
                      <span className="rounded border border-[var(--color-terminal-border)] px-2 py-0.5 text-[10px] text-[var(--color-terminal-muted)]">
                        {formatModelLabel(message.modelId)}
                      </span>
                    </div>
                    {message.role === "user" ? (
                      <p className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </p>
                    ) : (
                      <div className="prose max-w-none text-sm">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div>
                <div className="flex items-start gap-3">
                  <span className="mt-1 min-w-[60px] text-xs font-bold text-[var(--color-terminal-accent)]">
                    agent &gt;
                  </span>
                  <div className="flex-1">
                    <div className="mb-2">
                      <span className="rounded border border-[var(--color-terminal-border)] px-2 py-0.5 text-[10px] text-[var(--color-terminal-muted)]">
                        {formatModelLabel(selectedModelId)}
                      </span>
                    </div>
                    <span className="cursor-blink text-sm text-[var(--color-terminal-muted)]">
                      running in vercel sandbox
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-4">
        <form onSubmit={onSubmit} className="relative mx-auto max-w-4xl">
          <CommandPalette
            filter={paletteFilter}
            onSelect={handleCommandSelect}
            visible={showPalette}
          />
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-bg)] px-4 py-3 transition-colors focus-within:border-[var(--color-terminal-accent)]">
            <span className="text-sm font-bold text-[var(--color-terminal-green)]">
              $
            </span>
            <select
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
              disabled={isLoading || isLoadingModels || models.length === 0}
              className="w-64 rounded border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] px-3 py-2 text-xs text-[var(--color-terminal-text)] outline-none focus:border-[var(--color-terminal-accent)] disabled:opacity-50"
            >
              {models.length === 0 ? (
                <option value="">
                  {isLoadingModels ? "Loading models..." : "No models available"}
                </option>
              ) : (
                models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName} ({model.id})
                  </option>
                ))
              )}
            </select>
            <input
              ref={inputRef}
              value={input}
              onChange={onInputChange}
              placeholder={
                canSend
                  ? "Type a command (/earnings NVDA Q4 2024) or ask a question..."
                  : hasAnyKey
                    ? "Waiting for model list..."
                    : "Set your Anthropic API key first..."
              }
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-terminal-muted)]"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !canSend}
              className="rounded bg-[var(--color-terminal-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-terminal-bg)] transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              Run
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-[var(--color-terminal-muted)]">
            Choose the model for this message, then press Enter to send.
          </p>
        </form>
      </div>
    </div>
  );
}
