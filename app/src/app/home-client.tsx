"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getApiKeyMode } from "@/lib/agent-config";
import type {
  ClaudeCommandSummary,
  ClaudePluginSummary,
  ClaudeSkillSummary,
  ClaudeUiCatalog,
} from "@/lib/claude-runtime-catalog";
import { formatCatalogForChat } from "@/lib/claude-chat-catalog";
import {
  getCommandCompletionValue,
  getCommandPaletteMatches,
} from "@/lib/command-palette";
import {
  pickDefaultModelId,
  type ChatModelOption,
} from "@/lib/anthropic-models";

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
  filtered,
  onSelect,
  visible,
}: {
  filtered: ClaudeCommandSummary[];
  onSelect: (cmd: ClaudeCommandSummary) => void;
  visible: boolean;
}) {
  if (!visible || filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-72 overflow-y-auto rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] shadow-2xl">
      {filtered.map((command) => (
        <button
          key={command.sourcePath}
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

function PluginCard({
  plugin,
  commands,
  skills,
  onCommand,
}: {
  plugin: ClaudePluginSummary;
  commands: ClaudeCommandSummary[];
  skills: ClaudeSkillSummary[];
  onCommand: (text: string) => void;
}) {
  const pluginCommands = commands
    .filter((command) => command.pluginId === plugin.id)
    .slice(0, 4);
  const pluginSkills = skills
    .filter((skill) => skill.pluginId === plugin.id)
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-terminal-accent)]">
          {plugin.displayName}
        </h3>
        <p className="mt-1 text-xs text-[var(--color-terminal-muted)]">
          {plugin.description}
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-terminal-border)]">
          {plugin.commandCount} commands • {plugin.skillCount} skills
        </p>
      </div>

      {pluginCommands.length > 0 ? (
        <div className="space-y-1.5">
          {pluginCommands.map((command) => (
            <button
              key={command.sourcePath}
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
        </div>
      ) : (
        <div className="space-y-1 text-xs text-[var(--color-terminal-muted)]">
          {pluginSkills.map((skill) => (
            <div key={skill.sourcePath}>
              <span className="text-[var(--color-terminal-green)]">
                {skill.name}
              </span>{" "}
              <span>{skill.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({
  commands,
  plugins,
  skills,
  onCommand,
}: {
  commands: ClaudeCommandSummary[];
  plugins: ClaudePluginSummary[];
  skills: ClaudeSkillSummary[];
  onCommand: (text: string) => void;
}) {
  const workspaceCommands = commands.filter((command) => !command.pluginId);
  const workspaceSkills = skills.filter((skill) => !skill.pluginId);
  const hasDiscoveredCapabilities =
    plugins.length > 0 || workspaceCommands.length > 0 || workspaceSkills.length > 0;

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-10 text-center">
          <div className="mb-3 text-4xl font-bold text-[var(--color-terminal-green)]">
            $ finance-agent
          </div>
          <p className="text-sm text-[var(--color-terminal-muted)]">
            Dynamic Claude plugin and skill discovery powered by Vercel Sandbox
          </p>
        </div>

        {!hasDiscoveredCapabilities ? (
          <div className="rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-5 text-sm text-[var(--color-terminal-muted)]">
            No `.claude` commands, skills, or enabled plugins were discovered.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                commands={commands}
                skills={skills}
                onCommand={onCommand}
              />
            ))}

            {(workspaceCommands.length > 0 || workspaceSkills.length > 0) && (
              <div className="rounded-lg border border-[var(--color-terminal-border)] bg-[var(--color-terminal-surface)] p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-[var(--color-terminal-accent)]">
                    Workspace
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-terminal-muted)]">
                    Local `.claude` commands and skills discovered at runtime.
                  </p>
                </div>

                <div className="space-y-1.5">
                  {workspaceCommands.slice(0, 4).map((command) => (
                    <button
                      key={command.sourcePath}
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

                  {workspaceCommands.length === 0 &&
                    workspaceSkills.slice(0, 3).map((skill) => (
                      <div key={skill.sourcePath} className="py-0.5 text-xs">
                        <span className="text-[var(--color-terminal-green)]">
                          {skill.name}
                        </span>{" "}
                        <span className="text-[var(--color-terminal-muted)]">
                          {skill.description}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-[var(--color-terminal-muted)]">
          Refresh the page after adding or removing `.claude` files or enabled
          plugins to see the current catalog.
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
  catalog,
  serverHasApiKey,
}: {
  catalog: ClaudeUiCatalog;
  serverHasApiKey: boolean;
}) {
  const { commands, plugins, skills } = catalog;
  const { apiKey, setApiKey, loaded } = useApiKey();
  const [showSettings, setShowSettings] = useState(false);
  const catalogIntroMessage = useMemo(() => {
    if (
      catalog.plugins.length === 0 &&
      catalog.commands.length === 0 &&
      catalog.skills.length === 0
    ) {
      return null;
    }

    return createChatMessage("assistant", formatCatalogForChat(catalog));
  }, [catalog]);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    catalogIntroMessage ? [catalogIntroMessage] : []
  );
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
  const inputPlaceholderExample = useMemo(() => {
    const exampleCommand =
      commands.find((command) => command.hint) ?? commands[0];

    if (!exampleCommand) {
      return "Ask a question or describe a task";
    }

    return `${exampleCommand.name}${exampleCommand.hint ? ` ${exampleCommand.hint}` : ""}`;
  }, [commands]);

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
  const filteredCommands = useMemo(
    () => getCommandPaletteMatches(commands, paletteFilter),
    [commands, paletteFilter]
  );

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
        createChatMessage(
          "assistant",
          data.result || "",
          data.model || selectedModelId
        ),
      ]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "An error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleCommandSelect(command: ClaudeCommandSummary) {
    setInput(getCommandCompletionValue(command));
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

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (
      event.key === "Tab" &&
      !event.shiftKey &&
      showPalette &&
      filteredCommands.length > 0
    ) {
      event.preventDefault();
      handleCommandSelect(filteredCommands[0]);
    }
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
        <WelcomeScreen
          commands={commands}
          plugins={plugins}
          skills={skills}
          onCommand={handleCommand}
        />
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
            filtered={filteredCommands}
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
                  ? `Type a command (${inputPlaceholderExample}) or ask a question...`
                  : hasAnyKey
                    ? "Waiting for model list..."
                    : "Set your Anthropic API key first..."
              }
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-terminal-muted)]"
              disabled={isLoading}
              onKeyDown={onInputKeyDown}
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
